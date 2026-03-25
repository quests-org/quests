import mockFs from "mock-fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProjectSubdomainSchema } from "../../schemas/subdomains";
import { createMockAppConfig } from "../../test/helpers/mock-app-config";
import { tsCommand } from "./ts";

vi.mock(import("../execa-node-for-app"));

describe("tsCommand", () => {
  const appConfig = createMockAppConfig(ProjectSubdomainSchema.parse("test"));

  afterEach(() => {
    mockFs.restore();
  });

  it("errors when no file argument provided", async () => {
    const result = await tsCommand([], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "ts command requires a file argument (e.g., ts scripts/setup.ts). Running ts without arguments spawns an interactive shell.",
        "type": "execute-error",
      }
    `);
  });

  it("executes eval code via -e flag by writing a tmp file", async () => {
    mockFs({ [appConfig.appDir]: {} });

    const { execaNodeForApp } = await import("../execa-node-for-app");
    vi.mocked(execaNodeForApp).mockResolvedValueOnce({
      all: "hello",
      exitCode: 0,
    } as never);

    const result = await tsCommand(["-e", "console.log('hello')"], appConfig);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toMatchObject({
      command: "ts -e <code>",
      exitCode: 0,
    });
    expect(vi.mocked(execaNodeForApp)).toHaveBeenCalledWith(
      appConfig,
      appConfig.workspaceConfig.pnpmBinPath,
      expect.arrayContaining([
        "dlx",
        "jiti",
        expect.stringContaining("ts-eval-"),
      ]),
      expect.any(Object),
      undefined,
    );
  });

  it("executes eval code via --eval flag by writing a tmp file", async () => {
    mockFs({ [appConfig.appDir]: {} });

    const { execaNodeForApp } = await import("../execa-node-for-app");
    vi.mocked(execaNodeForApp).mockResolvedValueOnce({
      all: "hello",
      exitCode: 0,
    } as never);

    const result = await tsCommand(
      ["--eval", "console.log('hello')"],
      appConfig,
    );

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toMatchObject({
      command: "ts -e <code>",
      exitCode: 0,
    });
    expect(vi.mocked(execaNodeForApp)).toHaveBeenCalledWith(
      appConfig,
      appConfig.workspaceConfig.pnpmBinPath,
      expect.arrayContaining([
        "dlx",
        "jiti",
        expect.stringContaining("ts-eval-"),
      ]),
      expect.any(Object),
      undefined,
    );
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
      undefined,
    );
  });
});
