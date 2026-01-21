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

  it("filters debugger messages from output", () => {
    const output = `
    Error: Tool call execution failed for 'tool-run_shell_command': Command failed with exit code 1: pnpm dlx jiti scripts/test-06-dependencies.ts

    Debugger attached.
    Debugger attached.
    ✓ Test 6: Dependency Imports and Zod Validation
    ✓ Valid user parsed: { id: 1, email: 'user@example.com', age: 30, active: true }
    ✓ Caught validation errors:
    TypeError: Cannot read properties of undefined (reading 'forEach')
    Waiting for the debugger to disconnect...
    Waiting for the debugger to disconnect...`;

    const result = filterShellOutput(output, appDir);
    expect(result).toMatchInlineSnapshot(`
      "
          Error: Tool call execution failed for 'tool-run_shell_command': Command failed with exit code 1: pnpm dlx jiti scripts/test-06-dependencies.ts

          ✓ Test 6: Dependency Imports and Zod Validation
          ✓ Valid user parsed: { id: 1, email: 'user@example.com', age: 30, active: true }
          ✓ Caught validation errors:
          TypeError: Cannot read properties of undefined (reading 'forEach')"
    `);
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

  it("filters debugger messages in test environment", () => {
    process.env.NODE_ENV = "test";
    expect(shouldFilterDebuggerMessage("Debugger attached.")).toBe(true);
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
