import { describe, expect, it, vi } from "vitest";

import { ProjectSubdomainSchema } from "../../schemas/subdomains";
import { createMockAppConfig } from "../../test/helpers/mock-app-config";
import { tsCommand } from "./ts";

vi.mock(import("../execa-node-for-app"));

describe("tsCommand", () => {
  const appConfig = createMockAppConfig(ProjectSubdomainSchema.parse("test"));

  it("errors when no file argument provided", async () => {
    const result = await tsCommand([], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "ts command requires a file argument (e.g., ts scripts/setup.ts). Running ts without arguments spawns an interactive shell.",
        "type": "execute-error",
      }
    `);
  });

  it("errors when -e flag is used", async () => {
    const result = await tsCommand(["-e", "console.log('test')"], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "ts does not support the -e/--eval flag for evaluating code strings directly. Instead, write your code to a .ts or .js file and execute it with ts.",
        "type": "execute-error",
      }
    `);
  });

  it("errors when --eval flag is used", async () => {
    const result = await tsCommand(
      ["--eval", "console.log('test')"],
      appConfig,
    );

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "ts does not support the -e/--eval flag for evaluating code strings directly. Instead, write your code to a .ts or .js file and execute it with ts.",
        "type": "execute-error",
      }
    `);
  });

  it("errors when only flags are provided with no file", async () => {
    const result = await tsCommand(["--verbose"], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "ts requires exactly one file path as a positional argument (e.g., ts scripts/setup.ts).",
        "type": "execute-error",
      }
    `);
  });

  it("passes named flags and their values through to the script", async () => {
    const { execaNodeForApp } = await import("../execa-node-for-app");
    vi.mocked(execaNodeForApp).mockResolvedValueOnce({
      all: "",
      exitCode: 0,
    } as never);

    const result = await tsCommand(
      [
        "./skills/pdf-to-markdown/scripts/convert.ts",
        "--file",
        "./user-provided/test.pdf",
        "--output",
        "./output/test.md",
      ],
      appConfig,
    );

    expect(result.isOk()).toBe(true);
    expect(vi.mocked(execaNodeForApp)).toHaveBeenCalledWith(
      appConfig,
      appConfig.workspaceConfig.pnpmBinPath,
      [
        "dlx",
        "jiti",
        "./skills/pdf-to-markdown/scripts/convert.ts",
        "--file",
        "./user-provided/test.pdf",
        "--output",
        "./output/test.md",
      ],
      expect.any(Object),
    );
  });
});
