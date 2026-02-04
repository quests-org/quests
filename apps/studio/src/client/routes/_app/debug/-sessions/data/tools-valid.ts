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
            explanation: "Find all TypeScript files in the src directory",
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
            explanation: "Search for all usages of the formatDate function",
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
          input: {
            explanation: "Check for TypeScript errors in the codebase",
          },
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
            explanation:
              "Read the helpers file to understand the implementation",
            filePath: "./src/utils/helpers.ts",
          },
          output: {
            content:
              "     1\texport function formatDate(date: Date): string {\n     2\t  return date.toISOString();\n     3\t}\n     4\t\n     5\texport function parseJSON(str: string): unknown {\n     6\t  return JSON.parse(str);\n     7\t}",
            filePath: "./src/utils/helpers.ts",
          },
          type: "tool-read_file",
        }),
        builder.textPart(
          "I can see the issue. Let me fix the parseJSON function by adding a generic type parameter.",
          assistantMessageId,
        ),
        builder.toolPart(assistantMessageId, "output-available", {
          input: {
            explanation: "Add generic type parameter to parseJSON function",
            filePath: "./src/utils/helpers.ts",
            newString:
              "export function parseJSON<T = unknown>(str: string): T {\n  return JSON.parse(str) as T;\n}",
            oldString:
              "export function parseJSON(str: string): unknown {\n  return JSON.parse(str);\n}",
          },
          output: {
            diff: "Index: ./src/utils/helpers.ts\n===================================================================\n--- ./src/utils/helpers.ts\n+++ ./src/utils/helpers.ts\n@@ -4,6 +4,6 @@\n \n-export function parseJSON(str: string): unknown {\n-  return JSON.parse(str);\n+export function parseJSON<T = unknown>(str: string): T {\n+  return JSON.parse(str) as T;\n }",
            filePath: "./src/utils/helpers.ts",
          },
          type: "tool-edit_file",
        }),
        builder.textPart(
          "Now let me create a new test file to verify the changes.",
          assistantMessageId,
        ),
        builder.toolPart(assistantMessageId, "output-available", {
          input: {
            content:
              'import { describe, expect, it } from "vitest";\nimport { formatDate, parseJSON } from "./helpers";\n\ndescribe("helpers", () => {\n  it("should format date", () => {\n    const date = new Date("2024-01-01");\n    expect(formatDate(date)).toBe("2024-01-01T00:00:00.000Z");\n  });\n\n  it("should parse JSON with type inference", () => {\n    const result = parseJSON<{ name: string }>(\'{"name":"test"}\');\n    expect(result.name).toBe("test");\n  });\n});',
            explanation: "Create test file to verify the parseJSON changes",
            filePath: "./src/utils/helpers.test.ts",
          },
          output: {
            filePath: "./src/utils/helpers.test.ts",
          },
          type: "tool-write_file",
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
          "Perfect! I've successfully demonstrated all the tools:\n1. Found TypeScript files using glob\n2. Searched for formatDate usages with grep\n3. Ran diagnostics to find type errors\n4. Read file contents using read_file\n5. Edited the file using edit_file\n6. Created a new test file using write_file\n7. Ran tests using shell command",
          assistantMessageId,
        ),
      ],
      role: "assistant",
    },
  ],
  name: "Tools: Valid",
});
