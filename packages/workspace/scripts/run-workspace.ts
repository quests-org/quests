import "dotenv/config";
import { call } from "@orpc/server";
import {
  aiGatewayApp,
  type AIGatewayProviderConfig,
  fetchAISDKModel,
} from "@quests/ai-gateway";
import { AIProviderConfigIdSchema } from "@quests/shared";
import { execa } from "execa";
import path from "node:path";
import readline from "node:readline";
import { ulid } from "ulid";
import { createActor } from "xstate";

import { workspaceMachine } from "../src/electron";
import { getCurrentDate } from "../src/lib/get-current-date";
import { project } from "../src/rpc/routes/project";
import { StoreId } from "../src/schemas/store-id";
import { env } from "./lib/env";

const cacheIdentifier = "quests-run-workspace";
const PROVIDER_CONFIGS: AIGatewayProviderConfig.Type[] = [
  {
    apiKey: "ollama",
    cacheIdentifier,
    id: AIProviderConfigIdSchema.parse(ulid()),
    type: "ollama",
  },
];

const providerConfigs: {
  envKey: keyof typeof env;
  type: AIGatewayProviderConfig.Type["type"];
}[] = [
  { envKey: "QUESTS_OPENAI_API_KEY", type: "openai" },
  { envKey: "QUESTS_OPENROUTER_API_KEY", type: "openrouter" },
  { envKey: "QUESTS_ANTHROPIC_API_KEY", type: "anthropic" },
  { envKey: "QUESTS_GOOGLE_API_KEY", type: "google" },
  { envKey: "QUESTS_AI_GATEWAY_API_KEY", type: "vercel" },
  { envKey: "QUESTS_ZAI_API_KEY", type: "z-ai" },
  { envKey: "QUESTS_CEREBRAS_API_KEY", type: "cerebras" },
  { envKey: "QUESTS_GROQ_API_KEY", type: "groq" },
];

for (const { envKey, type } of providerConfigs) {
  const apiKey = env[envKey];
  if (apiKey) {
    PROVIDER_CONFIGS.push({
      apiKey,
      cacheIdentifier,
      id: AIProviderConfigIdSchema.parse(ulid()),
      type,
    });
  }
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
    getAIProviderConfigs: () => PROVIDER_CONFIGS,
    nodeExecEnv: {},
    pnpmBinPath: await execa({ reject: false })`which pnpm`.then(
      (result) => result.stdout.trim() || "pnpm",
    ),
    registryDir,
    // Sibling directory to monorepo to avoid using same pnpm and git
    rootDir: path.resolve("../../../workspace.local"),
    // Uncomment to test built shim
    // shimClientDir: path.resolve("../shim-client/dist"),
    shimClientDir: "dev-server",
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
            event.event.type === "agent.usingTool" ||
            event.event.type.toLowerCase().includes("heartbeat")
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
        // modelURI: "anthropic/claude-sonnet-4?provider=anthropic",
        // modelURI: "openai/gpt-5-mini?provider=openai",
        // modelURI: "google/gemini-2.5-pro?provider=google",
        // modelURI: "google/gemini-2.5-flash?provider=google",
        modelURI: "x-ai/grok-code-fast-1?provider=openrouter",
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
