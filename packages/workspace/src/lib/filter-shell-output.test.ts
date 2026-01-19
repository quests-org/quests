import { beforeEach, describe, expect, it } from "vitest";

import { AppDirSchema } from "../schemas/paths";
import {
  filterShellOutput,
  shouldFilterDebuggerMessage,
} from "./filter-shell-output";

describe("filterShellOutput", () => {
  const appDir = AppDirSchema.parse("/absolute/path/to/my project");

  it("replaces absolute path with relative path", () => {
    const output = `$ pnpm lint

> quests-template-basic@0.0.0 lint ${appDir}
> eslint .


${appDir}/scripts/interleave-demo.ts
   6:1  warning  Unexpected console statement  no-console

✖ 1 problems (0 errors, 1 warnings)`;

    const result = filterShellOutput(output, appDir);

    expect(result).toMatchInlineSnapshot(`
      "$ pnpm lint

      > quests-template-basic@0.0.0 lint .
      > eslint .


      ./scripts/interleave-demo.ts
         6:1  warning  Unexpected console statement  no-console

      ✖ 1 problems (0 errors, 1 warnings)"
    `);
  });

  it("replaces multiple occurrences of absolute path", () => {
    const output = `${appDir}/file1.ts
${appDir}/file2.ts
${appDir}/file3.ts`;

    const result = filterShellOutput(output, appDir);

    expect(result).toMatchInlineSnapshot(`
      "./file1.ts
      ./file2.ts
      ./file3.ts"
    `);
  });

  it("handles output without absolute path", () => {
    const output = `$ pnpm test

> test passed

✓ All tests passed`;

    const result = filterShellOutput(output, appDir);

    expect(result).toMatchInlineSnapshot(`
      "$ pnpm test

      > test passed

      ✓ All tests passed"
    `);
  });

  it("handles empty output", () => {
    const result = filterShellOutput("", appDir);

    expect(result).toMatchInlineSnapshot(`""`);
  });
});

describe("shouldFilterDebuggerMessage", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("filters debugger attached message in development", () => {
    process.env.NODE_ENV = "development";
    expect(shouldFilterDebuggerMessage("Debugger attached.")).toBe(true);
  });

  it("filters waiting for debugger message in development", () => {
    process.env.NODE_ENV = "development";
    expect(
      shouldFilterDebuggerMessage("Waiting for the debugger to disconnect..."),
    ).toBe(true);
  });

  it("does not filter debugger messages in production", () => {
    process.env.NODE_ENV = "production";
    expect(shouldFilterDebuggerMessage("Debugger attached.")).toBe(false);
    expect(
      shouldFilterDebuggerMessage("Waiting for the debugger to disconnect..."),
    ).toBe(false);
  });

  it("does not filter other messages", () => {
    process.env.NODE_ENV = "development";
    expect(shouldFilterDebuggerMessage("Some other message")).toBe(false);
  });
});
