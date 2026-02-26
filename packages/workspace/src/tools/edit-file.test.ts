import mockFs from "mock-fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectSubdomainSchema } from "../schemas/subdomains";
import { createMockAIGatewayModel } from "../test/helpers/mock-ai-gateway-model";
import {
  createMockAppConfig,
  MOCK_WORKSPACE_DIRS,
} from "../test/helpers/mock-app-config";
import { TOOLS } from "./all";

const model = createMockAIGatewayModel();
const appConfig = createMockAppConfig(ProjectSubdomainSchema.parse("test"), {
  model,
});

const GREP_FILE_CONTENT = `This is a test file for grep functionality.

It contains multiple lines with various patterns to test:
- async functions
- regular expressions
- file system operations
- error handling

The grep tests will look for:
1. Specific keywords like "async" and "function"
2. Regular expressions like "test.*file"
3. Error messages and patterns

This file should help verify that the grep implementation:
- Finds all matches in a file
- Handles multiple matches correctly
- Returns empty array when no matches found
- Properly handles special characters

Some example patterns to search for:
async function testGrep() {
  console.log("Testing grep functionality");
  throw new Error("Test error message");
}

// Some JSX
export function HelloWorld() {
  return <div>Hello World</div>;
}
`;

function makeExecuteArgs(
  input: Parameters<typeof TOOLS.EditFile.execute>[0]["input"],
) {
  return {
    agentName: "main" as const,
    appConfig,
    input,
    model,
    projectState: {},
    signal: AbortSignal.timeout(10_000),
    spawnAgent: vi.fn(),
  };
}

function setupMockFs(files: Record<string, string> = {}) {
  mockFs({
    [MOCK_WORKSPACE_DIRS.projects]: {
      [appConfig.folderName]: {
        "grep-test.txt": GREP_FILE_CONTENT,
        ...files,
      },
    },
  });
}

describe("EditFile", () => {
  afterEach(() => {
    mockFs.restore();
  });

  describe("execute - not found cases", () => {
    beforeEach(() => {
      setupMockFs();
    });

    it("should return error when file does not exist", async () => {
      const result = await TOOLS.EditFile.execute(
        makeExecuteArgs({
          filePath: "./non-existent-file.txt",
          newString: "new text",
          oldString: "old text",
        }),
      );

      expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
        {
          "message": "File ./non-existent-file.txt not found",
          "type": "execute-error",
        }
      `);
    });

    it("should return error when path is a directory", async () => {
      const result = await TOOLS.EditFile.execute(
        makeExecuteArgs({
          filePath: "./",
          newString: "new text",
          oldString: "old text",
        }),
      );

      expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
        {
          "message": "Path is a directory, not a file: ./",
          "type": "execute-error",
        }
      `);
    });

    it("should return error when oldString is not found in file content", async () => {
      const result = await TOOLS.EditFile.execute(
        makeExecuteArgs({
          filePath: "./grep-test.txt",
          newString: "new text",
          oldString: "this text does not exist in the file",
        }),
      );

      expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
        {
          "message": "Failed to edit file ./grep-test.txt: oldString not found in content",
          "type": "execute-error",
        }
      `);
    });

    it("should return error when oldString has multiple matches and needs more context", async () => {
      const result = await TOOLS.EditFile.execute(
        makeExecuteArgs({
          filePath: "./grep-test.txt",
          newString: "new text",
          oldString: "grep",
        }),
      );

      expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
        {
          "message": "Failed to edit file ./grep-test.txt: Found multiple matches for oldString. Include more surrounding code lines in oldString to uniquely identify which occurrence to replace.",
          "type": "execute-error",
        }
      `);
    });
  });

  describe("execute - replaceAll", () => {
    beforeEach(() => {
      setupMockFs();
    });

    it("should replace all occurrences when replaceAll is true", async () => {
      const result = await TOOLS.EditFile.execute(
        makeExecuteArgs({
          filePath: "./grep-test.txt",
          newString: "GREP",
          oldString: "grep",
          replaceAll: true,
        }),
      );

      expect(result._unsafeUnwrap()).toMatchInlineSnapshot(`
          {
            "diff": "Index: ./grep-test.txt
          ===================================================================
          --- ./grep-test.txt
          +++ ./grep-test.txt
          @@ -1,26 +1,26 @@
          -This is a test file for grep functionality.
          +This is a test file for GREP functionality.
           
           It contains multiple lines with various patterns to test:
           - async functions
           - regular expressions
           - file system operations
           - error handling
           
          -The grep tests will look for:
          +The GREP tests will look for:
           1. Specific keywords like "async" and "function"
           2. Regular expressions like "test.*file"
           3. Error messages and patterns
           
          -This file should help verify that the grep implementation:
          +This file should help verify that the GREP implementation:
           - Finds all matches in a file
           - Handles multiple matches correctly
           - Returns empty array when no matches found
           - Properly handles special characters
           
           Some example patterns to search for:
           async function testGrep() {
          -  console.log("Testing grep functionality");
          +  console.log("Testing GREP functionality");
             throw new Error("Test error message");
           }
           
           // Some JSX
          ",
            "filePath": "./grep-test.txt",
          }
        `);
    });

    it("should error on multiple matches without replaceAll", async () => {
      const result = await TOOLS.EditFile.execute(
        makeExecuteArgs({
          filePath: "./grep-test.txt",
          newString: "GREP",
          oldString: "grep",
        }),
      );

      expect(result._unsafeUnwrapErr()).toBeDefined();
    });
  });
});
