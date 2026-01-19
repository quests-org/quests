import { type SessionMessage, StoreId } from "@quests/workspace/client";

import { SessionBuilder } from "./helpers";

const builder = new SessionBuilder();
const sessionId = builder.getSessionId();

const userMessageId = StoreId.newMessageId();
const assistantMessageId = StoreId.newMessageId();

export const toolsInvalidSession: SessionMessage.WithParts[] = [
  {
    id: userMessageId,
    metadata: {
      createdAt: builder.nextTime(),
      sessionId,
    },
    parts: [
      builder.textPart(
        "Help me with some file operations and searches.",
        userMessageId,
      ),
    ],
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
      builder.textPart(
        "I'll help you with file operations. Let me start by searching for files.",
        assistantMessageId,
      ),
      builder.toolPart(assistantMessageId, "output-error", {
        errorText: "Invalid glob pattern: Pattern cannot be empty",
        input: {
          pattern: "",
        },
        type: "tool-glob",
      }),
      builder.textPart(
        "Let me try searching for a pattern in the codebase.",
        assistantMessageId,
      ),
      builder.toolPart(assistantMessageId, "output-error", {
        errorText: "Search pattern is required and cannot be empty",
        input: {
          pattern: "",
        },
        type: "tool-grep",
      }),
      builder.textPart("Let me try to run diagnostics.", assistantMessageId),
      builder.toolPart(assistantMessageId, "output-error", {
        errorText: "Failed to run diagnostics: TypeScript compiler not found",
        input: {},
        type: "tool-run_diagnostics",
      }),
      builder.textPart(
        "Let me try to execute a shell command.",
        assistantMessageId,
      ),
      builder.toolPart(assistantMessageId, "output-error", {
        errorText:
          "Invalid command. The available commands are: cp, ls, mkdir, mv, rm, pnpm, tsc, tsx.",
        input: {
          command: "cat src/file.ts",
          explanation: "Read file contents",
          timeoutMs: 30_000,
        },
        type: "tool-run_shell_command",
      }),
      builder.textPart(
        "Let me try to read a file that doesn't exist.",
        assistantMessageId,
      ),
      builder.toolPart(assistantMessageId, "output-error", {
        errorText: "File not found: src/nonexistent.ts",
        input: {
          filePath: "src/nonexistent.ts",
        },
        type: "tool-read_file",
      }),
      builder.textPart(
        "Let me try to write to an invalid path.",
        assistantMessageId,
      ),
      builder.toolPart(assistantMessageId, "output-error", {
        errorText: "Invalid path: Cannot write outside project directory",
        input: {
          content: "console.log('test');",
          filePath: "../outside/file.ts",
        },
        type: "tool-write_file",
      }),
      builder.textPart(
        "Let me try to edit a file with invalid parameters.",
        assistantMessageId,
      ),
      builder.toolPart(assistantMessageId, "output-error", {
        errorText:
          "Edit failed: old_string not found in file src/app.ts. The string may have already been changed.",
        input: {
          filePath: "src/app.ts",
          newString: "const newValue = 42;",
          oldString: "const oldValue = 10;",
        },
        type: "tool-edit_file",
      }),
      builder.textPart(
        "I encountered errors with all the tool calls. Each tool failed with specific validation or execution errors.",
        assistantMessageId,
      ),
    ],
    role: "assistant",
  },
];
