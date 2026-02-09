import { StoreId } from "@quests/workspace/client";

import { registerSession, SessionBuilder } from "../helpers";

const builder = new SessionBuilder();
const sessionId = builder.getSessionId();

const assistantMessageId = StoreId.newMessageId();

registerSession({
  messages: [
    builder.userMessage("Do everything, but stream it all."),
    {
      id: assistantMessageId,
      metadata: {
        createdAt: builder.nextTime(),
        finishReason: "tool-calls",
        modelId: "claude-sonnet-4.5",
        providerId: "anthropic",
        sessionId,
      },
      parts: [
        builder.toolPart(assistantMessageId, "input-streaming", {
          input: {
            choices: ["React", "Vue", "Svelte"],
            question: "Which framework should we use?",
          },
          type: "tool-choose",
        }),
        builder.toolPart(assistantMessageId, "input-streaming", {
          input: {
            explanation: "Update greeting message",
            filePath: "./src/hello.ts",
            newString: "  console.log('Hello, developer!');",
            oldString: "  console.log('Hello, world!');",
          },
          type: "tool-edit_file",
        }),
        builder.toolPart(assistantMessageId, "input-streaming", {
          input: {
            explanation: "Generate a sunset image",
            filePath: "./images/sunset.png",
            prompt: "A beautiful sunset over mountains",
          },
          type: "tool-generate_image",
        }),
        builder.toolPart(assistantMessageId, "input-streaming", {
          input: {
            explanation: "Find all TypeScript files",
            pattern: "src/**/*.ts",
          },
          type: "tool-glob",
        }),
        builder.toolPart(assistantMessageId, "input-streaming", {
          input: {
            explanation: "Search for formatDate usages",
            pattern: "formatDate",
          },
          type: "tool-grep",
        }),
        builder.toolPart(assistantMessageId, "input-streaming", {
          input: {
            explanation: "Read the helpers file",
            filePath: "./src/utils/helpers.ts",
          },
          type: "tool-read_file",
        }),
        builder.toolPart(assistantMessageId, "input-streaming", {
          input: {
            explanation: "Check for TypeScript errors",
          },
          type: "tool-run_diagnostics",
        }),
        builder.toolPart(assistantMessageId, "input-streaming", {
          input: {
            command: "npm test -- helpers.test.ts",
            explanation: "Run tests for helpers module",
            timeoutMs: 30_000,
          },
          type: "tool-run_shell_command",
        }),
        builder.toolPart(assistantMessageId, "input-streaming", {
          input: {
            thought:
              "Let me consider the best approach for refactoring this module.",
          },
          type: "tool-think",
        }),
        builder.toolPart(assistantMessageId, "input-streaming", {
          input: {},
          type: "tool-unavailable",
        }),
        builder.toolPart(assistantMessageId, "input-streaming", {
          input: {
            explanation: "Search for Vitest best practices",
            query: "Vitest configuration best practices 2025",
          },
          type: "tool-web_search",
        }),
        builder.toolPart(assistantMessageId, "input-streaming", {
          input: {
            content:
              "export function hello() {\n  console.log('Hello, world!');\n}",
            explanation: "Create a hello function",
            filePath: "./src/hello.ts",
          },
          type: "tool-write_file",
        }),
      ],
      role: "assistant",
    },
  ],
  name: "Tools: Input Streaming",
});
