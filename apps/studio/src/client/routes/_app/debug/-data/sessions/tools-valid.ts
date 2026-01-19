import { type SessionMessage, StoreId } from "@quests/workspace/client";

import { SessionBuilder } from "./helpers";

const builder = new SessionBuilder();
const sessionId = builder.getSessionId();

const userMessageId = StoreId.newMessageId();
const assistantMessageId = StoreId.newMessageId();

export const toolsValidSession: SessionMessage.WithParts[] = [
  {
    id: userMessageId,
    metadata: {
      createdAt: builder.nextTime(),
      sessionId,
    },
    parts: [
      builder.textPart(
        "Help me explore and refactor the codebase. I need to find files, read them, search for patterns, run diagnostics, and make some changes.",
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
        "I'll help you explore and refactor the codebase. Let me start by finding relevant files using glob.",
        assistantMessageId,
      ),
      builder.toolPart(assistantMessageId, "output-available", {
        input: {
          pattern: "src/**/*.ts",
        },
        output: {
          files: [
            "src/utils/helpers.ts",
            "src/utils/validation.ts",
            "src/config.ts",
            "src/app.ts",
          ],
        },
        type: "tool-glob",
      }),
      builder.textPart(
        "Found TypeScript files. Now let me search for usages of formatDate using grep.",
        assistantMessageId,
      ),
      builder.toolPart(assistantMessageId, "output-available", {
        input: {
          pattern: "formatDate",
        },
        output: {
          matches: [
            {
              lineNum: 1,
              lineText: "export function formatDate(date: Date): string {",
              modifiedAt: 1_704_067_200_000,
              path: "src/utils/helpers.ts",
            },
            {
              lineNum: 5,
              lineText: "import { formatDate } from './utils/helpers';",
              modifiedAt: 1_704_067_300_000,
              path: "src/app.ts",
            },
            {
              lineNum: 12,
              lineText: "  const formatted = formatDate(new Date());",
              modifiedAt: 1_704_067_300_000,
              path: "src/app.ts",
            },
          ],
          totalMatches: 3,
          truncated: false,
        },
        type: "tool-grep",
      }),
      builder.textPart(
        "Found usages. Let me run diagnostics to check for any issues.",
        assistantMessageId,
      ),
      builder.toolPart(assistantMessageId, "output-available", {
        input: {},
        output: {
          diagnostics:
            "src/utils/helpers.ts:7:20 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'Date'.\nsrc/app.ts:15:10 - error TS2322: Type 'number' is not assignable to type 'string'.",
          errors: [
            "src/utils/helpers.ts:7:20 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'Date'.",
            "src/app.ts:15:10 - error TS2322: Type 'number' is not assignable to type 'string'.",
          ],
        },
        type: "tool-run_diagnostics",
      }),
      builder.textPart(
        "Found errors. Let me read the helpers file to understand the issue better.",
        assistantMessageId,
      ),
      builder.toolPart(assistantMessageId, "output-available", {
        input: {
          command: "cat src/utils/helpers.ts",
          explanation: "Read helpers file to see the implementation",
          timeoutMs: 30_000,
        },
        output: {
          combined:
            "export function formatDate(date: Date): string {\n  return date.toISOString();\n}\n\nexport function parseJSON(str: string): unknown {\n  return JSON.parse(str);\n}",
          command: "cat src/utils/helpers.ts",
          exitCode: 0,
        },
        type: "tool-run_shell_command",
      }),
      builder.textPart(
        "Now let me create a patch file with the fix.",
        assistantMessageId,
      ),
      builder.toolPart(assistantMessageId, "output-available", {
        input: {
          command:
            'echo "export function parseJSON<T = unknown>(str: string): T { return JSON.parse(str) as T; }" > /tmp/fix.patch',
          explanation: "Create patch file with the fix",
          timeoutMs: 30_000,
        },
        output: {
          combined: "",
          command:
            'echo "export function parseJSON<T = unknown>(str: string): T { return JSON.parse(str) as T; }" > /tmp/fix.patch',
          exitCode: 0,
        },
        type: "tool-run_shell_command",
      }),
      builder.textPart(
        "Let me run tests to verify everything works.",
        assistantMessageId,
      ),
      builder.toolPart(assistantMessageId, "output-available", {
        input: {
          command: "npm test -- helpers.test.ts",
          explanation: "Run tests for helpers module",
          timeoutMs: 30_000,
        },
        output: {
          combined:
            "PASS src/utils/helpers.test.ts\n  helpers\n    ✓ should format date (2ms)\n    ✓ should parse JSON (1ms)\n\nTest Suites: 1 passed, 1 total\nTests:       2 passed, 2 total",
          command: "npm test -- helpers.test.ts",
          exitCode: 0,
        },
        type: "tool-run_shell_command",
      }),
      builder.textPart(
        "Perfect! I've successfully demonstrated all the tools:\n1. Found TypeScript files using glob\n2. Searched for formatDate usages with grep\n3. Ran diagnostics to find type errors\n4. Read file contents using shell command\n5. Created a patch file using shell command\n6. Ran tests using shell command",
        assistantMessageId,
      ),
    ],
    role: "assistant",
  },
];
