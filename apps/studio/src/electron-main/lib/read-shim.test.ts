import { describe, expect, it } from "vitest";

import { readWindowsShim, resolveShimTarget } from "./read-shim";

const createWindowsShim = (targetPath: string) => {
  return `@SETLOCAL
@IF NOT DEFINED NODE_PATH (
  @SET "NODE_PATH=C:\\Users\\tests\\code\\quests\\node_modules\\.pnpm\\pnpm@10.13.1\\node_modules\\pnpm\\bin\\node_modules;C:\\Users\\tests\\code\\quests\\node_modules\\.pnpm\\pnpm@10.13.1\\node_modules\\pnpm\\node_modules;C:\\Users\\tests\\code\\quests\\node_modules\\.pnpm\\pnpm@10.13.1\\node_modules;C:\\Users\\tests\\code\\quests\\node_modules\\.pnpm\\node_modules"
) ELSE (
  @SET "NODE_PATH=C:\\Users\\tests\\code\\quests\\node_modules\\.pnpm\\pnpm@10.13.1\\node_modules\\pnpm\\bin\\node_modules;C:\\Users\\tests\\code\\quests\\node_modules\\.pnpm\\pnpm@10.13.1\\node_modules\\pnpm\\node_modules;C:\\Users\\tests\\code\\quests\\node_modules\\.pnpm\\pnpm@10.13.1\\node_modules;C:\\Users\\tests\\code\\quests\\node_modules\\.pnpm\\node_modules;%NODE_PATH%"
)
@IF EXIST "%~dp0\\node.exe" (
  "%~dp0\\node.exe"  "%~dp0\\${targetPath}" %*
) ELSE (
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  node  "%~dp0\\${targetPath}" %*
)`;
};

describe("readWindowsShim", () => {
  it("should extract the relative target path from a Windows pnpm shim with .cjs", () => {
    const shimContent = createWindowsShim("..\\pnpm\\bin\\pnpm.cjs");
    const result = readWindowsShim(shimContent);

    expect(result).toBe("..\\pnpm\\bin\\pnpm.cjs");
  });

  it("should extract path with .js extension", () => {
    const shimContent = createWindowsShim("..\\pnpm\\bin\\pnpm.js");
    const result = readWindowsShim(shimContent);

    expect(result).toBe("..\\pnpm\\bin\\pnpm.js");
  });

  it("should extract path with .mjs extension", () => {
    const shimContent = createWindowsShim("..\\pnpm\\bin\\pnpm.mjs");
    const result = readWindowsShim(shimContent);

    expect(result).toBe("..\\pnpm\\bin\\pnpm.mjs");
  });

  it("should extract path when using node.exe explicitly", () => {
    const shimContent = createWindowsShim("..\\pnpm\\bin\\pnpm.cjs").replace(
      'node  "%~dp0',
      'node.exe  "%~dp0',
    );
    const result = readWindowsShim(shimContent);

    expect(result).toBe("..\\pnpm\\bin\\pnpm.cjs");
  });
});

describe("resolveShimTarget", () => {
  it("should resolve a relative path from the shim file location", () => {
    const shimFilePath = "/usr/local/bin/pnpm";
    const relativePath = "../lib/node_modules/pnpm/bin/pnpm.cjs";

    const result = resolveShimTarget(shimFilePath, relativePath);

    expect(result).toBe("/usr/local/lib/node_modules/pnpm/bin/pnpm.cjs");
  });
});
