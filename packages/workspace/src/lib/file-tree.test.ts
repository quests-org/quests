import path from "node:path";
import { describe, expect, it } from "vitest";

import { AbsolutePathSchema } from "../schemas/paths";
import { fileTree } from "./file-tree";

describe("file-tree", () => {
  it("should show directories that contain only dot files", async () => {
    const fixturesDir = AbsolutePathSchema.parse(
      path.join(import.meta.dirname, "../../fixtures/file-system"),
    );

    const result = await fileTree(fixturesDir);

    expect(result.isOk()).toBe(true);

    if (result.isOk()) {
      const tree = result.value;
      expect(tree).toMatchInlineSnapshot(`
        "a-folder/
          built-in.ts
          external-module.ts
        dot-files-only/ (empty)
        folder/
          other2.txt
          test3.txt
        ignored-folder/
          except-me.txt
        nested/
          another/
            file.txt
          level1/
            test-deep.txt
        .gitignore
        empty-file.txt
        grep-test-2.txt
        grep-test.txt
        json-file.json
        other.txt
        test1.txt
        test2.txt"
      `);

      // The key assertion: dot-files-only directory should be present
      expect(tree).toContain("dot-files-only/");
    }
  });
});
