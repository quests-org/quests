import { StoreId } from "@quests/workspace/client";

import { registerSession, SessionBuilder } from "../helpers";

const builder = new SessionBuilder();
const sessionId = builder.getSessionId();

const userMessageId = StoreId.newMessageId();
const assistantMessageId = StoreId.newMessageId();

registerSession({
  messages: [
    {
      id: userMessageId,
      metadata: {
        createdAt: builder.nextTime(),
        sessionId,
      },
      parts: [builder.textPart("Do everything and fail.", userMessageId)],
      role: "user",
    },
    {
      id: assistantMessageId,
      metadata: {
        createdAt: builder.nextTime(),
        finishReason: "stop",
        modelId: "claude-sonnet-4.5",
        providerId: "anthropic",
        sessionId,
      },
      parts: [
        builder.toolPart(assistantMessageId, "output-error", {
          errorText: "No choices provided",
          input: {
            choices: [],
            question: "Which framework?",
          },
          type: "tool-choose",
        }),
        builder.toolPart(assistantMessageId, "output-error", {
          errorText:
            "old_string not found in file src/app.ts. The string may have already been changed.",
          input: {
            filePath: "src/app.ts",
            newString: "const x = 1;",
            oldString: "const y = 2;",
          },
          type: "tool-edit_file",
        }),
        builder.toolPart(assistantMessageId, "output-error", {
          errorText: "Image generation timed out after 120s",
          input: {
            explanation: "Generate a logo",
            filePath: "./assets/logo",
            prompt: "A modern tech logo",
          },
          type: "tool-generate_image",
        }),
        builder.toolPart(assistantMessageId, "output-error", {
          errorText: "Invalid glob pattern: Pattern cannot be empty",
          input: {
            pattern: "",
          },
          type: "tool-glob",
        }),
        builder.toolPart(assistantMessageId, "output-error", {
          errorText: "Search pattern is required and cannot be empty",
          input: {
            pattern: "",
          },
          type: "tool-grep",
        }),
        builder.toolPart(assistantMessageId, "output-error", {
          errorText: "File not found: src/nonexistent.ts",
          input: {
            filePath: "src/nonexistent.ts",
          },
          type: "tool-read_file",
        }),
        builder.toolPart(assistantMessageId, "output-error", {
          errorText: "Failed to run diagnostics: TypeScript compiler not found",
          input: {},
          type: "tool-run_diagnostics",
        }),
        builder.toolPart(assistantMessageId, "output-error", {
          errorText:
            "Invalid command. The available commands are: cp, ls, mkdir, mv, rm, pnpm, tsc, tsx.",
          input: {
            command: "rm -rf /",
            explanation: "Delete everything",
            timeoutMs: 5000,
          },
          type: "tool-run_shell_command",
        }),
        builder.toolPart(assistantMessageId, "output-error", {
          errorText: "Think tool execution failed unexpectedly",
          input: {
            thought: "Let me consider...",
          },
          type: "tool-think",
        }),
        builder.toolPart(assistantMessageId, "output-error", {
          errorText: "Tool 'foobar' is not available",
          input: {},
          type: "tool-unavailable",
        }),
        builder.toolPart(assistantMessageId, "output-error", {
          errorText: "Web search request failed: 429 Too Many Requests",
          input: {
            explanation: "Search for docs",
            query: "vitest configuration",
          },
          type: "tool-web_search",
        }),
        builder.toolPart(assistantMessageId, "output-error", {
          errorText: "Invalid path: Cannot write outside project directory",
          input: {
            content: "console.log('test');",
            filePath: "../outside/file.ts",
          },
          type: "tool-write_file",
        }),
      ],
      role: "assistant",
    },
  ],
  name: "Tools: Output Error",
});
