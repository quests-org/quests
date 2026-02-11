import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { AppDirSchema } from "../schemas/paths";
import { ProjectSubdomainSchema } from "../schemas/subdomains";
import { createMockAIGatewayModel } from "../test/helpers/mock-ai-gateway-model";
import { createMockAppConfig } from "../test/helpers/mock-app-config";
import { TOOLS } from "./all";
import { Grep } from "./grep";

const model = createMockAIGatewayModel();

function createFixturesAppConfig() {
  const mockConfig = createMockAppConfig(ProjectSubdomainSchema.parse("test"), {
    model,
  });
  // Override appDir to point to fixtures directory
  const appDir = AppDirSchema.parse(
    path.join(import.meta.dirname, "../../fixtures/file-system"),
  );
  return {
    ...mockConfig,
    appDir,
  };
}

// Sort matches deterministically for testing
function sortMatchesForTesting(
  matches: { lineNum: number; lineText: string; path: string }[],
) {
  return matches.sort((a, b) => {
    // First sort by path
    if (a.path !== b.path) {
      return a.path.localeCompare(b.path);
    }
    // Then by line number
    if (a.lineNum !== b.lineNum) {
      return a.lineNum - b.lineNum;
    }
    // Finally by line text
    return a.lineText.localeCompare(b.lineText);
  });
}

describe("Grep", () => {
  describe("resultToPrompt", () => {
    it("should return 'No matches found' when there are no matches", () => {
      const result = Grep.toModelOutput({
        input: {
          pattern: "",
        },
        output: {
          matches: [],
          totalMatches: 0,
          truncated: false,
        },
        toolCallId: "123",
      });
      expect(result).toMatchInlineSnapshot(`
        {
          "type": "error-text",
          "value": "No matches found",
        }
      `);
    });

    it("should format matches grouped by file and sorted by modification time", () => {
      const result = Grep.toModelOutput({
        input: {
          pattern: "",
        },
        output: {
          matches: [
            // Older file first in input (should be moved to end after sorting)
            {
              lineNum: 5,
              lineText: "export const baz = 'qux';",
              modifiedAt: 1_234_567_880_000, // older
              path: "src/file2.ts",
            },
            // Newer file matches (should be moved to beginning after sorting)
            {
              lineNum: 10,
              lineText: "const foo = 'bar';",
              modifiedAt: 1_234_567_890_000, // newer
              path: "src/file1.ts",
            },
            {
              lineNum: 20,
              lineText: "console.log(foo);",
              modifiedAt: 1_234_567_890_000, // newer
              path: "src/file1.ts",
            },
          ],
          totalMatches: 3,
          truncated: false,
        },
        toolCallId: "123",
      });
      expect(result).toMatchInlineSnapshot(`
        {
          "type": "text",
          "value": "Found 3 matches
        src/file1.ts:
          Line 10: const foo = 'bar';
          Line 20: console.log(foo);

        src/file2.ts:
          Line 5: export const baz = 'qux';",
        }
      `);
    });

    it("should show truncation warning when results are truncated", () => {
      const result = Grep.toModelOutput({
        input: {
          pattern: "",
        },
        output: {
          matches: [
            {
              lineNum: 10,
              lineText: "const foo = 'bar';",
              modifiedAt: 1_234_567_890_000,
              path: "src/file1.ts",
            },
          ],
          totalMatches: 150,
          truncated: true,
        },
        toolCallId: "123",
      });
      expect(result).toMatchInlineSnapshot(`
        {
          "type": "text",
          "value": "Found 1 matches
        src/file1.ts:
          Line 10: const foo = 'bar';

        (Results are truncated. Consider using a more specific path or pattern.)",
        }
      `);
    });

    it("should handle single match in single file", () => {
      const result = Grep.toModelOutput({
        input: {
          pattern: "",
        },
        output: {
          matches: [
            {
              lineNum: 42,
              lineText: "const answer = 42;",
              modifiedAt: 1_234_567_890_000,
              path: "src/single.ts",
            },
          ],
          totalMatches: 1,
          truncated: false,
        },
        toolCallId: "123",
      });
      expect(result).toMatchInlineSnapshot(`
        {
          "type": "text",
          "value": "Found 1 matches
        src/single.ts:
          Line 42: const answer = 42;",
        }
      `);
    });
  });

  describe("execute", () => {
    it("should find matches for a specific pattern in fixtures", async () => {
      const result = await TOOLS.Grep.execute({
        agentName: "main",
        appConfig: createFixturesAppConfig(),
        input: {
          explanation: "Looking for async functions",
          pattern: "async function",
        },
        model,
        signal: AbortSignal.timeout(10_000),
        spawnAgent: vi.fn(),
      });

      expect(result.isOk()).toBe(true);
      expect(
        sortMatchesForTesting(
          result
            ._unsafeUnwrap()
            // Omit modifiedAt as it's not deterministic
            .matches.map(({ modifiedAt: _modifiedAt, ...rest }) => rest),
        ),
      ).toMatchInlineSnapshot(`
        [
          {
            "lineNum": 4,
            "lineText": "- async functions",
            "path": "./grep-test-2.txt",
          },
          {
            "lineNum": 21,
            "lineText": "async function testGrep() {",
            "path": "./grep-test-2.txt",
          },
          {
            "lineNum": 4,
            "lineText": "- async functions",
            "path": "./grep-test.txt",
          },
          {
            "lineNum": 21,
            "lineText": "async function testGrep() {",
            "path": "./grep-test.txt",
          },
        ]
      `);
    });

    it("should return no matches when pattern is not found", async () => {
      const result = await TOOLS.Grep.execute({
        agentName: "main",
        appConfig: createFixturesAppConfig(),
        input: {
          explanation: "Looking for non-existent pattern",
          pattern: "nonexistent-pattern-xyz123",
        },
        model,
        signal: AbortSignal.timeout(10_000),
        spawnAgent: vi.fn(),
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.matches).toEqual([]);
        expect(result.value.totalMatches).toBe(0);
        expect(result.value.truncated).toBe(false);
      }
    });

    it("should use smart case to match case insensitively for lowercase patterns", async () => {
      const result = await TOOLS.Grep.execute({
        agentName: "main",
        appConfig: createFixturesAppConfig(),
        input: {
          pattern: "handles",
        },
        model,
        signal: AbortSignal.timeout(10_000),
        spawnAgent: vi.fn(),
      });

      expect(result.isOk()).toBe(true);
      expect(
        sortMatchesForTesting(
          result
            ._unsafeUnwrap()
            // Omit modifiedAt as it's not deterministic
            .matches.map(({ modifiedAt: _modifiedAt, ...rest }) => rest),
        ),
      ).toMatchInlineSnapshot(`
        [
          {
            "lineNum": 16,
            "lineText": "- Handles multiple matches correctly",
            "path": "./grep-test-2.txt",
          },
          {
            "lineNum": 18,
            "lineText": "- Properly handles special characters",
            "path": "./grep-test-2.txt",
          },
          {
            "lineNum": 16,
            "lineText": "- Handles multiple matches correctly",
            "path": "./grep-test.txt",
          },
          {
            "lineNum": 18,
            "lineText": "- Properly handles special characters",
            "path": "./grep-test.txt",
          },
          {
            "lineNum": 7,
            "lineText": "This ensures grep handles multiple nested directories correctly.",
            "path": "./nested/another/file.txt",
          },
        ]
      `);
    });

    it("should use smart case to match case sensitively for uppercase patterns", async () => {
      const result = await TOOLS.Grep.execute({
        agentName: "main",
        appConfig: createFixturesAppConfig(),
        input: {
          pattern: "Handles",
        },
        model,
        signal: AbortSignal.timeout(10_000),
        spawnAgent: vi.fn(),
      });

      expect(result.isOk()).toBe(true);
      expect(
        sortMatchesForTesting(
          result
            ._unsafeUnwrap()
            // Omit modifiedAt as it's not deterministic
            .matches.map(({ modifiedAt: _modifiedAt, ...rest }) => rest),
        ),
      ).toMatchInlineSnapshot(`
        [
          {
            "lineNum": 16,
            "lineText": "- Handles multiple matches correctly",
            "path": "./grep-test-2.txt",
          },
          {
            "lineNum": 16,
            "lineText": "- Handles multiple matches correctly",
            "path": "./grep-test.txt",
          },
        ]
      `);
    });

    it("should match all text after the first colon", async () => {
      const result = await TOOLS.Grep.execute({
        agentName: "main",
        appConfig: createFixturesAppConfig(),
        input: {
          pattern: "zzz",
        },
        model,
        signal: AbortSignal.timeout(10_000),
        spawnAgent: vi.fn(),
      });

      expect(result.isOk()).toBe(true);
      expect(
        sortMatchesForTesting(
          result
            ._unsafeUnwrap()
            // Omit modifiedAt as it's not deterministic
            .matches.map(({ modifiedAt: _modifiedAt, ...rest }) => rest),
        ),
      ).toMatchInlineSnapshot(`
        [
          {
            "lineNum": 4,
            "lineText": "      "exclude": ["zzz-test-2.txt"]",
            "path": "./json-file.json",
          },
        ]
      `);
    });

    it("should handle nested folders with vertical bars", async () => {
      const result = await TOOLS.Grep.execute({
        agentName: "main",
        appConfig: createFixturesAppConfig(),
        input: {
          pattern: "vertical\\|bar",
        },
        model,
        signal: AbortSignal.timeout(10_000),
        spawnAgent: vi.fn(),
      });

      expect(result.isOk()).toBe(true);
      expect(
        sortMatchesForTesting(
          result
            ._unsafeUnwrap()
            // Omit modifiedAt as it's not deterministic
            .matches.map(({ modifiedAt: _modifiedAt, ...rest }) => rest),
        ),
      ).toMatchInlineSnapshot(`
        [
          {
            "lineNum": 4,
            "lineText": "- vertical|bars|everywhere",
            "path": "./nested/another/file.txt",
          },
          {
            "lineNum": 6,
            "lineText": "- vertical|bar|separator",
            "path": "./nested/level1/test-deep.txt",
          },
        ]
      `);
    });
  });
});
