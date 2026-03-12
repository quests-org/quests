import "dotenv/config";
import { call } from "@orpc/server";
import { aiGatewayApp } from "@quests/ai-gateway";
import { execa } from "execa";
import os from "node:os";
import path from "node:path";
import * as _ from "radashi";
import { ulid } from "ulid";
import { createActor } from "xstate";

import type { Session } from "../src/schemas/session";

import { env } from "../scripts/lib/env";
import { workspaceMachine } from "../src/electron";
import { createAppConfig } from "../src/lib/app-config/create";
import { type AppConfig } from "../src/lib/app-config/types";
import { isToolPart } from "../src/lib/is-tool-part";
import { publisher } from "../src/rpc/publisher";
import { project as projectRoute } from "../src/rpc/routes/project";
import { session as sessionRoute } from "../src/rpc/routes/session";
import { type FileUpload } from "../src/schemas/file-upload";
import { type SessionMessagePart } from "../src/schemas/session/message-part";
import { type StoreId } from "../src/schemas/store-id";
import { buildProviderConfigs, modelURI } from "./utils";

export interface Assertion {
  check: (ctx: AssertionContext) => AssertionResult | Promise<AssertionResult>;
  text: string;
}

export interface AssertionResult {
  evidence: string;
  passed: boolean;
  text: string;
}

const DEFAULT_MODEL_URI = modelURI.openRouter("anthropic/claude-haiku-4.5");

export interface EvalCase {
  assertions?: Assertion[];
  files?: FileUpload.Type[];
  folders?: { path: string }[];
  name: string;
  prompt: string;
  shouldStop?: (
    part: SessionMessagePart.Type,
    appConfig: AppConfig,
  ) => boolean | Promise<boolean>;
}

interface AssertionContext {
  appConfig: AppConfig;
  sessions: Session.WithMessagesAndParts[];
}

export function defineEval(evalCase: EvalCase): EvalCase {
  return evalCase;
}

export async function runEvals(
  evals: EvalCase[],
  {
    concurrency = 3,
    dryRun = false,
  }: { concurrency?: number; dryRun?: boolean } = {},
): Promise<{ workspaceRootDir: string }> {
  const workspaceRootDir = path.join(os.tmpdir(), "quests-evals", ulid());
  const providerConfigs = buildProviderConfigs();
  const registryDir = env.QUESTS_REGISTRY_DIR_PATH
    ? path.resolve(env.QUESTS_REGISTRY_DIR_PATH)
    : path.resolve(import.meta.dirname, "../../../registry");

  process.stdout.write(`Workspace  : ${workspaceRootDir}\n`);
  process.stdout.write(
    `Registry   : ${registryDir}${env.QUESTS_REGISTRY_DIR_PATH ? " (from QUESTS_REGISTRY_DIR_PATH)" : ""}\n`,
  );
  process.stdout.write(`Model      : ${DEFAULT_MODEL_URI}\n`);
  process.stdout.write(`Concurrency: ${concurrency}\n`);
  process.stdout.write(`Evals (${evals.length}):\n`);
  for (const evalCase of evals) {
    process.stdout.write(`  - ${evalCase.name}\n`);
  }
  process.stdout.write("\n");

  if (dryRun) {
    return { workspaceRootDir };
  }

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

  await _.parallel(concurrency, evals, async (evalCase) => {
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
        modelURI: DEFAULT_MODEL_URI,
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

          if (isToolPart(part) && part.state !== "input-streaming") {
            const stream =
              part.state === "output-error" ? process.stderr : process.stdout;
            stream.write(
              `[${evalCase.name}] tool="${part.type.replace("tool-", "")}" state="${part.state}"\n`,
            );
          }

          if (
            await evalCase.shouldStop?.(
              part,
              createAppConfig({
                subdomain,
                workspaceConfig: context.workspaceConfig,
              }),
            )
          ) {
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
  });

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
