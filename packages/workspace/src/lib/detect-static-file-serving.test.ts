import path from "node:path";
import { describe, expect, it } from "vitest";

import { APP_FOLDER_NAMES } from "../constants";
import { AbsolutePathSchema } from "../schemas/paths";
import {
  buildStaticFileServingInstructions,
  detectStaticFileServing,
} from "./detect-static-file-serving";

describe("detect-static-file-serving", () => {
  describe("detectStaticFileServing", () => {
    it("should detect both input and output folders in basic template", async () => {
      const basicTemplateDir = AbsolutePathSchema.parse(
        path.resolve(
          import.meta.dirname,
          "../../../../registry/templates/basic",
        ),
      );

      const result = await detectStaticFileServing(basicTemplateDir);

      expect(result).toHaveLength(1);
      // TODO: Will remove when static file serving is moved to app itself
      // expect(result).toContain("input");
      expect(result).toContain("output");
    });

    it("should return empty array when src/server/index.ts does not exist", async () => {
      const nonExistentDir = AbsolutePathSchema.parse(
        path.join(import.meta.dirname, "../../fixtures/file-system"),
      );

      const result = await detectStaticFileServing(nonExistentDir);

      expect(result).toEqual([]);
    });

    it("should return empty array when static serving patterns are not found", async () => {
      const angularTemplateDir = AbsolutePathSchema.parse(
        path.resolve(
          import.meta.dirname,
          "../../../../registry/templates/angular",
        ),
      );

      const result = await detectStaticFileServing(angularTemplateDir);

      expect(result).toEqual([]);
    });
  });

  describe("buildStaticFileServingInstructions", () => {
    it("should build instructions for both folders", () => {
      const instructions = buildStaticFileServingInstructions([
        APP_FOLDER_NAMES.userProvided,
        APP_FOLDER_NAMES.output,
      ]);

      expect(instructions).toMatchInlineSnapshot(`
        "# Static File Serving
        The server serves static files from specific directories, making them accessible to code running in the \`src/\` directory:
        - Files in \`./user-provided/\` are served at \`/user-provided/*\` (e.g., \`/user-provided/image.png\`)
        - Files in \`./output/\` are served at \`/output/*\` (e.g., \`/output/image.png\`)"
      `);
    });

    it("should build instructions for single folder", () => {
      const instructions = buildStaticFileServingInstructions([
        APP_FOLDER_NAMES.userProvided,
      ]);

      expect(instructions).toMatchInlineSnapshot(`
        "# Static File Serving
        The server serves static files from specific directories, making them accessible to code running in the \`src/\` directory:
        - Files in \`./user-provided/\` are served at \`/user-provided/*\` (e.g., \`/user-provided/image.png\`)"
      `);
    });

    it("should return empty string when no folders provided", () => {
      const instructions = buildStaticFileServingInstructions([]);

      expect(instructions).toBe("");
    });
  });
});
