import "dotenv/config";
import { call } from "@orpc/server";
import { aiGatewayApp } from "@quests/ai-gateway";
import { execa } from "execa";
import os from "node:os";
import path from "node:path";
import { ulid } from "ulid";
import { createActor } from "xstate";

import { workspaceMachine } from "../src/electron";
import { publisher } from "../src/rpc/publisher";
import { project as projectRoute } from "../src/rpc/routes/project";
import { session as sessionRoute } from "../src/rpc/routes/session";
import { type FileUpload } from "../src/schemas/file-upload";
import { type SessionMessagePart } from "../src/schemas/session/message-part";
import { type StoreId } from "../src/schemas/store-id";
import { buildProviderConfigs } from "./utils";

interface EvalCase {
  files?: FileUpload.Type[];
  folders?: { path: string }[];
  modelURI: string;
  name: string;
  prompt: string;
  shouldStop?: (part: SessionMessagePart.Type) => boolean;
}

export function defineEval(evalCase: EvalCase): EvalCase {
  return evalCase;
}

export async function runEvals(
  evals: EvalCase[],
): Promise<{ workspaceRootDir: string }> {
  const workspaceRootDir = path.join(os.tmpdir(), "quests-evals", ulid());
  const providerConfigs = buildProviderConfigs();
  const registryDir = path.resolve(import.meta.dirname, "../../../registry");

  const actor = createActor(workspaceMachine, {
    input: {
      aiGatewayApp,
      captureEvent: () => {
        return;
      },
      captureException: (...args: unknown[]) => {
        // eslint-disable-next-line no-console
        console.error("captureException", ...args);
      },
      getAIProviderConfigs: () => providerConfigs,
      nodeExecEnv: {},
      pnpmBinPath: await execa({ reject: false })`which pnpm`.then(
        (result) => result.stdout.trim() || "pnpm",
      ),
      registryDir,
      rootDir: workspaceRootDir,
      shimClientDir: "dev-server",
      trashItem: () => Promise.reject(new Error("Not implemented")),
    },
  });

  actor.start();

  process.stdout.write(`Workspace: ${workspaceRootDir}\n\n`);

  for (const evalCase of evals) {
    process.stdout.write(`[${evalCase.name}] Starting...\n`);

    const context = {
      workspaceConfig: actor.getSnapshot().context.config,
      workspaceRef: actor,
    };

    const { sessionId, subdomain } = await call(
      projectRoute.create,
      {
        files: evalCase.files,
        folders: evalCase.folders,
        modelURI: evalCase.modelURI,
        name: evalCase.name,
        preferredFolderName: evalCase.name,
        prompt: evalCase.prompt,
      },
      { context },
    );

    process.stdout.write(
      `[${evalCase.name}] Project created (subdomain: ${subdomain})\n`,
    );

    const abortController = new AbortController();
    const partUpdates = publisher.subscribe("part.updated", {
      signal: abortController.signal,
    });

    void (async () => {
      try {
        for await (const event of partUpdates) {
          if (event.subdomain !== subdomain) {
            continue;
          }

          const part = event.part;

          if (
            part.type.startsWith("tool-") &&
            "state" in part &&
            (part.state === "input-available" ||
              part.state === "output-available" ||
              part.state === "output-error")
          ) {
            const stream =
              part.state === "output-error" ? process.stderr : process.stdout;
            stream.write(
              `[${evalCase.name}] tool="${part.type.replace("tool-", "")}" state="${part.state}"\n`,
            );
          }

          if (evalCase.shouldStop?.(part)) {
            process.stdout.write(
              `[${evalCase.name}] shouldStop returned true, stopping session...\n`,
            );
            void call(sessionRoute.stop, { subdomain }, { context });
          }
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          throw error;
        }
      }
    })();

    await waitForSessionDone(sessionId, subdomain);
    abortController.abort();

    process.stdout.write(`[${evalCase.name}] Done.\n`);
  }

  actor.stop();

  return { workspaceRootDir };
}

async function waitForSessionDone(
  sessionId: StoreId.Session,
  subdomain: string,
): Promise<void> {
  return new Promise((resolve) => {
    const abortController = new AbortController();
    const unsubscribe = publisher.subscribe("appState.session.done", {
      signal: abortController.signal,
    });

    void (async () => {
      try {
        for await (const event of unsubscribe) {
          if (event.sessionId === sessionId && event.subdomain === subdomain) {
            abortController.abort();
            resolve();
            return;
          }
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          throw error;
        }
      }
    })();
  });
}
