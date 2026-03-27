import { InMemoryFs } from "just-bash";
import { describe, expect, it } from "vitest";

import { ProjectSubdomainSchema } from "../../schemas/subdomains";
import { createMockAppConfig } from "../../test/helpers/mock-app-config";
import { extractFileAndScriptArgs } from "./utils";

const appConfig = createMockAppConfig(ProjectSubdomainSchema.parse("test"));
const appDir = appConfig.appDir;
const fs = new InMemoryFs();

function resolvePath(cwd: string) {
  return (p: string) => fs.resolvePath(cwd, p);
}

describe("extractFileAndScriptArgs", () => {
  it("returns undefined when no positionals", () => {
    const result = extractFileAndScriptArgs(
      [],
      [],
      appConfig,
      appDir,
      resolvePath("/"),
    );
    expect(result).toBeUndefined();
  });

  describe("filePath resolution", () => {
    it.each([
      {
        cwd: "/",
        expected: "scripts/run.ts",
        input: "scripts/run.ts",
        label: "simple relative path from root cwd",
      },
      {
        cwd: "/",
        expected: "scripts/run.ts",
        input: "./scripts/run.ts",
        label: "dot-prefixed relative path from root cwd",
      },
      {
        cwd: "/",
        expected: "scripts/run.ts",
        input: "/scripts/run.ts",
        label: "virtual absolute path from root cwd",
      },
      {
        cwd: "/",
        expected: "etc/passwd",
        input: "../../../etc/passwd",
        label: "dot-dot traversal clamped to appDir from root cwd",
      },
      {
        cwd: "/skills/sharp-images",
        expected: "scripts/resize.ts",
        input: "scripts/resize.ts",
        label: "simple relative path from nested cwd",
      },
      {
        cwd: "/skills/sharp-images",
        expected: "scripts/resize.ts",
        input: "/skills/sharp-images/scripts/resize.ts",
        label: "virtual absolute path from nested cwd resolves correctly",
      },
      {
        cwd: "/skills/sharp-images",
        expected: "../../output/image.png",
        input: "../../output/image.png",
        label: "dot-dot traversal from nested cwd reaches project root",
      },
      {
        cwd: "/skills/sharp-images",
        expected: "../../output/image.png",
        input: "/output/image.png",
        label: "virtual absolute root-level path from nested cwd",
      },
      {
        cwd: "/skills/sharp-images",
        expected: "../../etc/passwd",
        input: "../../../../../../../../etc/passwd",
        label: "deep dot-dot traversal clamped to appDir",
      },
    ])("$label", ({ cwd, expected, input }) => {
      const appCwd = `${appDir}${cwd === "/" ? "" : cwd}`;
      const result = extractFileAndScriptArgs(
        [input],
        [input],
        appConfig,
        appCwd,
        resolvePath(cwd),
      );
      expect(result).toBeDefined();
      expect(result?.filePath).toBe(expected);
      expect(result?.filePath).not.toContain(appDir);
    });
  });

  describe("scriptArgs resolution", () => {
    it.each([
      {
        cwd: "/",
        expected: ["user-provided/file.txt"],
        label: "path-like args with ./ prefix are resolved",
        scriptArgs: ["./user-provided/file.txt"],
      },
      {
        cwd: "/",
        expected: ["user-provided/file.txt"],
        label: "virtual absolute path args are resolved",
        scriptArgs: ["/user-provided/file.txt"],
      },
      {
        cwd: "/skills/sharp-images",
        expected: ["../../output/image.png"],
        label: "dot-dot traversal args are resolved",
        scriptArgs: ["../../output/image.png"],
      },
      {
        cwd: "/",
        expected: ["--width", "800", "--fit", "cover"],
        label: "flag values without path characters are left as-is",
        scriptArgs: ["--width", "800", "--fit", "cover"],
      },
      {
        cwd: "/",
        expected: ["--output", "output/result.png", "--quality", "80"],
        label: "flag values mixed with path args",
        scriptArgs: ["--output", "./output/result.png", "--quality", "80"],
      },
      {
        cwd: "/skills/sharp-images",
        expected: ["../../output/result.png"],
        label:
          "virtual absolute path from nested cwd becomes correct relative path",
        scriptArgs: ["/output/result.png"],
      },
    ])("$label", ({ cwd, expected, scriptArgs }) => {
      const file = "script.ts";
      const args = [file, ...scriptArgs];
      const appCwd = `${appDir}${cwd === "/" ? "" : cwd}`;
      const result = extractFileAndScriptArgs(
        [file],
        args,
        appConfig,
        appCwd,
        resolvePath(cwd),
      );
      expect(result).toBeDefined();
      expect(result?.scriptArgs).toEqual(expected);
      for (const arg of result?.scriptArgs ?? []) {
        expect(arg).not.toContain(appDir);
      }
    });
  });
});
