import path from "node:path";
import { describe, expect, it } from "vitest";

import { AppDirSchema } from "../schemas/paths";
import { ProjectSubdomainSchema } from "../schemas/subdomains";
import { createMockAppConfig } from "../test/helpers/mock-app-config";
import { TOOLS } from "./all";

function createFixturesAppConfig() {
  const mockConfig = createMockAppConfig(ProjectSubdomainSchema.parse("test"));
  // Override appDir to point to fixtures directory
  const appDir = AppDirSchema.parse(
    path.join(import.meta.dirname, "../../fixtures/file-system"),
  );
  return {
    ...mockConfig,
    appDir,
  };
}

describe("EditFile", () => {
  describe("execute - not found cases", () => {
    it("should return error when file does not exist", async () => {
      const result = await TOOLS.EditFile.execute({
        appConfig: createFixturesAppConfig(),
        input: {
          filePath: "./non-existent-file.txt",
          newString: "new text",
          oldString: "old text",
        },
        signal: AbortSignal.timeout(10_000),
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toMatchInlineSnapshot(`
          {
            "message": "File ./non-existent-file.txt not found",
            "type": "execute-error",
          }
        `);
      }
    });

    it("should return error when path is a directory", async () => {
      const result = await TOOLS.EditFile.execute({
        appConfig: createFixturesAppConfig(),
        input: {
          filePath: "./",
          newString: "new text",
          oldString: "old text",
        },
        signal: AbortSignal.timeout(10_000),
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toMatchInlineSnapshot(`
          {
            "message": "Path is a directory, not a file: ./",
            "type": "execute-error",
          }
        `);
      }
    });

    it("should return error when oldString is not found in file content", async () => {
      const result = await TOOLS.EditFile.execute({
        appConfig: createFixturesAppConfig(),
        input: {
          filePath: "./grep-test.txt",
          newString: "new text",
          oldString: "this text does not exist in the file",
        },
        signal: AbortSignal.timeout(10_000),
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toMatchInlineSnapshot(`
          {
            "message": "Failed to edit file ./grep-test.txt: oldString not found in content",
            "type": "execute-error",
          }
        `);
      }
    });

    it("should return error when oldString has multiple matches and needs more context", async () => {
      const result = await TOOLS.EditFile.execute({
        appConfig: createFixturesAppConfig(),
        input: {
          filePath: "./grep-test.txt",
          newString: "new text",
          oldString: "grep",
        },
        signal: AbortSignal.timeout(10_000),
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toMatchInlineSnapshot(`
          {
            "message": "Failed to edit file ./grep-test.txt: Found multiple matches for oldString. Include more surrounding code lines in oldString to uniquely identify which occurrence to replace.",
            "type": "execute-error",
          }
        `);
      }
    });
  });
});
