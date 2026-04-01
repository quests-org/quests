import "dotenv/config";
import { call } from "@orpc/server";
import { aiGatewayApp, AIGatewayModelURI } from "@quests/ai-gateway";
import { execa } from "execa";
import os from "node:os";
import path from "node:path";
import * as _ from "radashi";
import { ulid } from "ulid";
import { createActor } from "xstate";

import type { Session } from "../src/schemas/session";

import { workspaceMachine } from "../src/electron";
import { createAppConfig } from "../src/lib/app-config/create";
import { type AppConfig } from "../src/lib/app-config/types";
import { isToolPart } from "../src/lib/is-tool-part";
import { getProjectUsageSummary } from "../src/lib/usage-summary";
import { publisher } from "../src/rpc/publisher";
import { project as projectRoute } from "../src/rpc/routes/project";
import { session as sessionRoute } from "../src/rpc/routes/session";
import { type FileUpload } from "../src/schemas/file-upload";
import { type SessionMessagePart } from "../src/schemas/session/message-part";
import { type StoreId } from "../src/schemas/store-id";
import { createStubBrowserConfig } from "../src/test/helpers/mock-app-config";
import {
  buildProviderConfigs,
  c,
  formatNumber,
  modelURI,
  resolveRegistryDir,
} from "./utils";

export interface Assertion {
  check: (ctx: AssertionContext) => AssertionResult | Promise<AssertionResult>;
  text: string;
}

export interface AssertionResult {
  evidence: string;
  passed: boolean;
  text: string;
}

function evalPrefix(name: string): string {
  return `${c.dim}[${name}]${c.reset} `;
}

export const MODELS = [
  modelURI.openRouter("anthropic/claude-haiku-4.5"),
  // modelURI.openRouter("openai/gpt-oss-120b"),
  // modelURI.openRouter("moonshotai/kimi-k2.5"),
  // modelURI.openRouter("openai/gpt-5.4-mini"),
  // modelURI.openRouter("openai/gpt-5.4-nano"),
];

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
  const registryDir = resolveRegistryDir();

  process.stdout.write(`${c.dim}Workspace :${c.reset} ${workspaceRootDir}\n`);
  process.stdout.write(`${c.dim}Registry  :${c.reset} ${registryDir}\n`);

  if (dryRun) {
    return { workspaceRootDir };
  }

  const actor = createActor(workspaceMachine, {
    input: {
      aiGatewayApp,
      browser: createStubBrowserConfig(),
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

  const runs = MODELS.flatMap((uri) => {
    const parsed = AIGatewayModelURI.parse(uri);
    const canonicalId = parsed.ok ? parsed.value.canonicalId : uri;
    const modelPrefix = sanitizeCanonicalId(canonicalId);
    return evals.map((evalCase) => ({ evalCase, modelPrefix, uri }));
  });

  await _.parallel(
    concurrency,
    runs,
    async ({ evalCase, modelPrefix, uri }) => {
      const label =
        MODELS.length > 1 ? `${evalCase.name}/${modelPrefix}` : evalCase.name;

      process.stdout.write(
        `${evalPrefix(label)}${c.dim}Starting...${c.reset}\n`,
      );

      const context = {
        workspaceConfig: actor.getSnapshot().context.config,
        workspaceRef: actor,
      };

      const { sessionId, subdomain } = await call(
        projectRoute.create,
        {
          files: evalCase.files,
          folders: evalCase.folders,
          modelURI: uri,
          name: evalCase.name,
          preferredFolderName:
            MODELS.length > 1
              ? `${modelPrefix}-${evalCase.name}`
              : evalCase.name,
          prompt: evalCase.prompt,
        },
        { context },
      );

      process.stdout.write(
        `${evalPrefix(label)}${c.green}Project created${c.reset}${c.dim} (subdomain: ${subdomain})${c.reset}\n`,
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
              isToolPart(part) &&
              part.state !== "input-streaming" &&
              part.state !== "input-available"
            ) {
              const isError = part.state === "output-error";
              const stream = isError ? process.stderr : process.stdout;
              const appConfig = createAppConfig({
                subdomain,
                workspaceConfig: context.workspaceConfig,
              });
              const usage = await getProjectUsageSummary(appConfig);
              const toolName = part.type.replace("tool-", "");
              const toolLabel = isError
                ? `${c.red}${toolName} ERROR${c.reset}`
                : `${c.cyan}${toolName}${c.reset}`;
              const statsSuffix = `  ${c.dim}tokens=${c.reset}${formatNumber(usage.totalTokens)}${c.dim} (in=${formatNumber(usage.inputTokens)} out=${formatNumber(usage.outputTokens)}) msgs=${c.reset}${c.yellow}${usage.messageCount}${c.reset}`;
              stream.write(`${evalPrefix(label)}${toolLabel}${statsSuffix}\n`);
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
                `${evalPrefix(label)}${c.yellow}shouldStop returned true, stopping session...${c.reset}\n`,
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

      process.stdout.write(`${evalPrefix(label)}${c.green}Done.${c.reset}\n`);
    },
  );

  actor.stop();

  return { workspaceRootDir };
}

function sanitizeCanonicalId(canonicalId: string): string {
  return canonicalId.replaceAll(/[^a-z0-9-]/gi, "-");
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
