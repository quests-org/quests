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

import { type WorkspaceAppProject } from "../src/client";
import { workspaceMachine } from "../src/electron";
import { getCurrentDate } from "../src/lib/get-current-date";
import { message as messageRoute } from "../src/rpc/routes/message";
import { project as projectRoute } from "../src/rpc/routes/project";
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
      id: AIProviderConfigIdSchema.parse(`${type}-config-id`),
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

let project: undefined | WorkspaceAppProject;
const sessionId = StoreId.newSessionId();

const FAKE_FILES = {
  audio: {
    content: "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
    filename: "sample.wav",
    mimeType: "audio/wav",
  },
  image: {
    content:
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    filename: "sample.png",
    mimeType: "image/png",
  },
  pdf: {
    content:
      "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvTWVkaWFCb3hbMCAwIDMgM10+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmCjAwMDAwMDAwMTAgMDAwMDAgbgowMDAwMDAwMDUzIDAwMDAwIG4KMDAwMDAwMDEwMiAwMDAwMCBuCnRyYWlsZXIKPDwvU2l6ZSA0L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMTQ5CiUlRU9G",
    filename: "sample.pdf",
    mimeType: "application/pdf",
  },
  text: {
    // cspell:disable-next-line
    content: "VGhpcyBpcyBhIHNhbXBsZSB0ZXh0IGZpbGUu",
    filename: "sample.txt",
    mimeType: "text/plain",
  },
};

function extractFilePrefix(input: string) {
  const prefixes = ["all:", "pdf:", "audio:", "image:", "text:"] as const;
  for (const prefix of prefixes) {
    if (input.toLowerCase().startsWith(prefix)) {
      if (prefix === "all:") {
        return {
          files: Object.values(FAKE_FILES).map((file) => ({
            ...file,
            mimeType: file.mimeType,
            size: Buffer.from(file.content, "base64").length,
          })),
          text: input.slice(prefix.length).trim(),
        };
      }
      const type = prefix.slice(0, -1) as keyof typeof FAKE_FILES;
      return {
        files: [
          {
            ...FAKE_FILES[type],
            mimeType: FAKE_FILES[type].mimeType,
            size: Buffer.from(FAKE_FILES[type].content, "base64").length,
          },
        ],
        text: input.slice(prefix.length).trim(),
      };
    }
  }
  return { files: undefined, text: input };
}

// eslint-disable-next-line no-console
console.log("Enter task prompt (press Enter to submit):");
rl.on("line", (input) => {
  if (input.trim()) {
    const trimmedInput = input.trim();
    const isChatMode = trimmedInput.toLowerCase().startsWith("chat:");
    const textAfterChatPrefix = isChatMode
      ? trimmedInput.slice(5).trim()
      : trimmedInput;
    const { files, text } = extractFilePrefix(textAfterChatPrefix);
    const finalMode = isChatMode ? "chat" : "app-builder";
    const messageId = StoreId.newMessageId();
    const message = {
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
          text,
          type: "text" as const,
        },
      ],
      role: "user" as const,
    };
    const context = {
      modelRegistry: {
        languageModel: fetchAISDKModel,
      },
      workspaceConfig: actor.getSnapshot().context.config,
      workspaceRef: actor,
    };

    const modelURI =
      // "anthropic/claude-sonnet-4?provider=anthropic&providerConfigId=anthropic-config-id";
      // "openai/gpt-5-mini?provider=openai&providerConfigId=openai-config-id";
      // "google/gemini-2.5-pro?provider=google&providerConfigId=google-config-id";
      // "google/gemini-2.5-flash?provider=google&providerConfigId=google-config-id";
      // "x-ai/grok-code-fast-1?provider=openrouter&providerConfigId=openrouter-config-id";
      // "google/gemini-3-pro-preview?provider=openrouter&providerConfigId=openrouter-config-id";
      "openai/gpt-5.2?provider=openrouter&providerConfigId=openrouter-config-id";

    if (project) {
      void call(
        messageRoute.create,
        {
          files,
          message,
          modelURI,
          sessionId,
          subdomain: project.subdomain,
        },
        { context },
      );
    } else {
      void call(
        projectRoute.create,
        {
          files,
          message,
          mode: finalMode,
          modelURI,
          sessionId,
        },
        { context },
      ).then((newProject) => {
        project = newProject;
      });
    }
  }
  // eslint-disable-next-line no-console
  console.log("\nEnter another task prompt (press Enter to submit):");
});

// Keep the process running
process.on("SIGINT", () => {
  actor.stop();
  throw new Error("SIGINT");
});
