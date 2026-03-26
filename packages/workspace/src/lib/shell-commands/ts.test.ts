import { type CommandContext, InMemoryFs } from "just-bash";
import mockFs from "mock-fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProjectSubdomainSchema } from "../../schemas/subdomains";
import { createMockAppConfig } from "../../test/helpers/mock-app-config";
import { createTsCommand } from "./ts";

vi.mock(import("../execa-node-for-app"));

const realFs = new InMemoryFs();

const mockCtx: CommandContext = {
  cwd: "/",
  env: new Map<string, string>(),
  fs: realFs,
  stdin: "",
};

describe("tsCommand", () => {
  const appConfig = createMockAppConfig(ProjectSubdomainSchema.parse("test"));
  const command = createTsCommand(appConfig);

  afterEach(() => {
    mockFs.restore();
    vi.unstubAllGlobals();
  });

  it("returns version string for --version", async () => {
    vi.stubGlobal("process", { ...process, version: "v20.0.0" });
    const result = await command.execute(["--version"], mockCtx);

    expect(result).toMatchInlineSnapshot(`
      {
        "exitCode": 0,
        "stderr": "",
        "stdout": "node v20.0.0",
      }
    `);
  });

  it("returns version string for -v", async () => {
    vi.stubGlobal("process", { ...process, version: "v20.0.0" });
    const result = await command.execute(["-v"], mockCtx);

    expect(result).toMatchInlineSnapshot(`
      {
        "exitCode": 0,
        "stderr": "",
        "stdout": "node v20.0.0",
      }
    `);
  });

  it("errors when no file argument provided", async () => {
    const result = await command.execute([], mockCtx);

    expect(result).toMatchInlineSnapshot(`
      {
        "exitCode": 1,
        "stderr": "tsx command requires a file argument (e.g., tsx scripts/setup.ts). Running tsx without arguments spawns an interactive shell.",
        "stdout": "",
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

    const result = await command.execute(
      ["-e", "console.log('hello')"],
      mockCtx,
    );

    expect(result.exitCode).toBe(0);
    expect(vi.mocked(execaNodeForApp)).toHaveBeenCalledWith(
      appConfig,
      appConfig.workspaceConfig.pnpmBinPath,
      expect.arrayContaining([
        "dlx",
        "jiti",
        expect.stringContaining("ts-eval-"),
      ]),
      expect.any(Object),
      expect.any(String),
    );
  });

  it("executes eval code via --eval flag by writing a tmp file", async () => {
    mockFs({ [appConfig.appDir]: {} });

    const { execaNodeForApp } = await import("../execa-node-for-app");
    vi.mocked(execaNodeForApp).mockResolvedValueOnce({
      all: "hello",
      exitCode: 0,
    } as never);

    const result = await command.execute(
      ["--eval", "console.log('hello')"],
      mockCtx,
    );

    expect(result.exitCode).toBe(0);
    expect(vi.mocked(execaNodeForApp)).toHaveBeenCalledWith(
      appConfig,
      appConfig.workspaceConfig.pnpmBinPath,
      expect.arrayContaining([
        "dlx",
        "jiti",
        expect.stringContaining("ts-eval-"),
      ]),
      expect.any(Object),
      expect.any(String),
    );
  });

  it("errors when only flags are provided with no file", async () => {
    const result = await command.execute(["--verbose"], mockCtx);

    expect(result).toMatchInlineSnapshot(`
      {
        "exitCode": 1,
        "stderr": "tsx requires exactly one file path as a positional argument (e.g., tsx scripts/setup.ts).",
        "stdout": "",
      }
    `);
  });

  it("passes named flags and their values through to the script", async () => {
    const { execaNodeForApp } = await import("../execa-node-for-app");
    vi.mocked(execaNodeForApp).mockResolvedValueOnce({
      all: "",
      exitCode: 0,
    } as never);

    const result = await command.execute(
      [
        "./skills/pdf-to-markdown/scripts/convert.ts",
        "--file",
        "./user-provided/test.pdf",
        "--output",
        "./output/test.md",
      ],
      mockCtx,
    );

    expect(result.exitCode).toBe(0);
    expect(vi.mocked(execaNodeForApp)).toHaveBeenCalledWith(
      appConfig,
      appConfig.workspaceConfig.pnpmBinPath,
      expect.arrayContaining([
        "dlx",
        "jiti",
        expect.stringContaining("convert.ts"),
        "--file",
        "./user-provided/test.pdf",
        "--output",
        "./output/test.md",
      ]),
      expect.any(Object),
      expect.any(String),
    );
  });

  describe("path escape prevention", () => {
    it.each([
      ["../../../etc/passwd", "dot-dot traversal from root cwd"],
      ["../../etc/passwd", "dot-dot traversal from nested cwd"],
      ["/etc/passwd", "absolute path outside appDir"],
      ["~/secret.ts", "tilde home path"],
    ])("clamps %s (%s) inside appDir", async (filePath, _desc) => {
      const { execaNodeForApp } = await import("../execa-node-for-app");
      vi.mocked(execaNodeForApp).mockResolvedValueOnce({
        all: "",
        exitCode: 0,
      } as never);

      await command.execute([filePath], mockCtx);

      const calledPath = vi.mocked(execaNodeForApp).mock.calls.at(-1)?.[2]?.[2];
      expect(calledPath).toBeDefined();
      expect(calledPath).toMatch(new RegExp(`^${appConfig.appDir}`));
    });

    it("clamps dot-dot traversal from a nested cwd inside appDir", async () => {
      const { execaNodeForApp } = await import("../execa-node-for-app");
      vi.mocked(execaNodeForApp).mockResolvedValueOnce({
        all: "",
        exitCode: 0,
      } as never);

      const nestedCtx: CommandContext = { ...mockCtx, cwd: "/scripts" };
      await command.execute(["../../../etc/passwd"], nestedCtx);

      const calledPath = vi.mocked(execaNodeForApp).mock.calls.at(-1)?.[2]?.[2];
      expect(calledPath).toBeDefined();
      expect(calledPath).toMatch(new RegExp(`^${appConfig.appDir}`));
    });
  });
});
