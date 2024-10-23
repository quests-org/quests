import "dotenv/config";
import { call } from "@orpc/server";
import {
  aiGatewayApp,
  type AIGatewayProvider,
  fetchAISDKModel,
} from "@quests/ai-gateway";
import { execa, parseCommandString } from "execa";
import { err, ok, type Result } from "neverthrow";
import path from "node:path";
import readline from "node:readline";
import { createActor } from "xstate";

import { workspaceMachine } from "../src/electron";
import { getCurrentDate } from "../src/lib/get-current-date";
import { project } from "../src/rpc/routes/project";
import { StoreId } from "../src/schemas/store-id";
import { env } from "./lib/env";

function scriptToCommand({
  port,
  script,
}: {
  port: number;
  script: string;
}): Result<string[], Error> {
  const [firstPart, ...rest] = parseCommandString(script);
  if (firstPart === "vite") {
    return ok([
      "pnpm",
      "exec",
      firstPart,
      ...rest,
      "--port",
      port.toString(),
      "--strictPort",
    ]);
  }
  return err(new Error(`Unknown script: ${script}`));
}

const registryDir = path.resolve("../../registry");
const actor = createActor(workspaceMachine, {
  input: {
    aiGatewayApp,
    captureEvent: (...args: unknown[]) => {
      // eslint-disable-next-line no-console
      console.log("captureEvent", args);
    },
    captureException: (...args: unknown[]) => {
      // eslint-disable-next-line no-console
      console.error("captureException", args);
    },
    getAIProviders: () => {
      const cacheIdentifier = "quests-run-workspace";
      const providers: AIGatewayProvider.Type[] = [
        {
          apiKey: "ollama",
          cacheIdentifier,
          type: "ollama",
        },
      ];

      if (env.QUESTS_OPENAI_API_KEY) {
        providers.push({
          apiKey: env.QUESTS_OPENAI_API_KEY,
          cacheIdentifier,
          type: "openai",
        });
      }

      if (env.QUESTS_OPENROUTER_API_KEY) {
        providers.push({
          apiKey: env.QUESTS_OPENROUTER_API_KEY,
          cacheIdentifier,
          type: "openrouter",
        });
      }

      if (env.QUESTS_ANTHROPIC_API_KEY) {
        providers.push({
          apiKey: env.QUESTS_ANTHROPIC_API_KEY,
          cacheIdentifier,
          type: "anthropic",
        });
      }

      if (env.QUESTS_GOOGLE_API_KEY) {
        providers.push({
          apiKey: env.QUESTS_GOOGLE_API_KEY,
          cacheIdentifier,
          type: "google",
        });
      }

      if (env.QUESTS_AI_GATEWAY_API_KEY) {
        providers.push({
          apiKey: env.QUESTS_AI_GATEWAY_API_KEY,
          cacheIdentifier,
          type: "vercel",
        });
      }

      return providers;
    },
    registryDir,
    // Sibling directory to monorepo to avoid using same pnpm and git
    rootDir: path.resolve("../../../workspace.local"),
    runPackageJsonScript: ({ cwd, script, scriptOptions, signal }) => {
      const command = scriptToCommand({
        port: scriptOptions.port,
        script,
      });
      if (command.isErr()) {
        return Promise.resolve(err(command.error));
      }
      try {
        let finalCommand = command.value;
        // Spawning directly to avoid orphaned processes
        if (
          command.value[0] === "pnpm" &&
          command.value[1] === "exec" &&
          command.value[2] === "vite"
        ) {
          finalCommand = ["node_modules/.bin/vite", ...command.value.slice(3)];
        }
        return Promise.resolve(
          ok(
            execa({
              cancelSignal: signal,
              cwd,
              env: scriptOptions.env,
            })`${finalCommand}`,
          ),
        );
      } catch (error) {
        return Promise.resolve(
          err(error instanceof Error ? error : new Error(String(error))),
        );
      }
    },
    runShellCommand: (command, { cwd, signal }) => {
      const [commandName, ...rest] = parseCommandString(command);
      if (commandName === "pnpm") {
        return Promise.resolve(
          ok(
            execa({
              cancelSignal: signal,
              cwd,
            })`${commandName} ${rest} --ignore-workspace`,
          ),
        );
      }
      if (commandName === "tsc") {
        return Promise.resolve(
          ok(
            execa({
              cancelSignal: signal,
              cwd,
            })`pnpm exec tsc ${rest.join(" ")}`,
          ),
        );
      }
      return Promise.resolve(err(new Error(`Not implemented: ${command}`)));
    },
    // Uncomment to test built shim
    // shimClientDir: path.resolve("../shim/dist"),
    shimClientDir: "dev-server",
    shimServerJSPath: path.resolve("../shim-server/dist/index.cjs"),
    trashItem: () => Promise.reject(new Error("Not implemented")),
  },
  inspect(event) {
    switch (event.type) {
      case "@xstate.action": {
        if (
          !event.action.type.startsWith("xstate.") &&
          event.action.type !== "actions"
        ) {
          // eslint-disable-next-line no-console
          console.log("action", event.action.type);
        }

        break;
      }
      case "@xstate.event": {
        if (!event.event.type.startsWith("xstate.")) {
          if (event.event.type === "taskEvent.tool-call-request-delta") {
            // Just log a single period per event with write not log
            process.stdout.write(".");
            return;
          }
          if (
            event.event.type === "workspaceServer.heartbeat" ||
            event.event.type === "updateHeartbeat"
          ) {
            // Too verbose to log
            return;
          }
          // eslint-disable-next-line no-console
          console.log(
            "event",
            event.event.type,
            "value" in event.event ? event.event.value : event.event,
          );
        }

        break;
      }
    }
  },
});
actor.start();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// eslint-disable-next-line no-console
console.log("Enter task prompt (press Enter to submit):");
rl.on("line", (input) => {
  if (input.trim()) {
    const sessionId = StoreId.newSessionId();
    const messageId = StoreId.newMessageId();
    void call(
      project.create,
      {
        message: {
          id: messageId,
          metadata: {
            createdAt: new Date(),
            sessionId,
          },
          parts: [
            {
              metadata: {
                createdAt: getCurrentDate(),
                id: StoreId.newPartId(),
                messageId,
                sessionId,
              },
              text: input,
              type: "text",
            },
          ],
          role: "user",
        },
        // modelId: "anthropic/claude-sonnet-4?provider=anthropic",
        // modelURI: "openai/gpt-5-mini?provider=openai",
        // modelURI: "google/gemini-2.5-pro?provider=google",
        modelURI: "google/gemini-2.5-flash?provider=google",
        sessionId,
      },
      {
        context: {
          modelRegistry: {
            languageModel: fetchAISDKModel,
          },
          workspaceConfig: actor.getSnapshot().context.config,
          workspaceRef: actor,
        },
      },
    );
  }
  // eslint-disable-next-line no-console
  console.log("\nEnter another task prompt (press Enter to submit):");
});

// Keep the process running
process.on("SIGINT", () => {
  actor.stop();
  throw new Error("SIGINT");
});
