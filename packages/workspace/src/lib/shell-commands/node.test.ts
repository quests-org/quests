import { type CommandContext, InMemoryFs } from "just-bash";
import { afterEach, assert, describe, expect, it, vi } from "vitest";

import { ProjectSubdomainSchema } from "../../schemas/subdomains";
import { createMockAppConfig } from "../../test/helpers/mock-app-config";
import { createNodeCommand } from "./node";

vi.mock("execa");

const realFs = new InMemoryFs();

const mockCtx: CommandContext = {
  cwd: "/",
  env: new Map<string, string>(),
  fs: realFs,
  stdin: "",
};

describe("nodeCommand", () => {
  const appConfig = createMockAppConfig(ProjectSubdomainSchema.parse("test"));
  const command = createNodeCommand(appConfig);

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("errors when no arguments provided", async () => {
    const result = await command.execute([], mockCtx);

    expect(result).toMatchInlineSnapshot(`
      {
        "exitCode": 1,
        "stderr": "node command requires a file argument or -e <code>. Prefer \`tsx\` for TypeScript files.",
        "stdout": "",
      }
    `);
  });

  it("errors when only flags are provided with no file or -e", async () => {
    const result = await command.execute(["--verbose"], mockCtx);

    expect(result).toMatchInlineSnapshot(`
      {
        "exitCode": 1,
        "stderr": "node requires a file path argument or -e <code>.",
        "stdout": "",
      }
    `);
  });

  it("executes --version", async () => {
    const { execa } = await import("execa");
    vi.mocked(execa).mockResolvedValueOnce({
      all: "v20.0.0",
      exitCode: 0,
    } as never);

    const result = await command.execute(["--version"], mockCtx);

    expect(result.exitCode).toBe(0);
    expect(vi.mocked(execa)).toHaveBeenCalledWith(
      process.execPath,
      ["--version"],
      expect.any(Object),
    );
  });

  it("executes -v as alias for --version", async () => {
    const { execa } = await import("execa");
    vi.mocked(execa).mockResolvedValueOnce({
      all: "v20.0.0",
      exitCode: 0,
    } as never);

    const result = await command.execute(["-v"], mockCtx);

    expect(result.exitCode).toBe(0);
    expect(vi.mocked(execa)).toHaveBeenCalledWith(
      process.execPath,
      ["--version"],
      expect.any(Object),
    );
  });

  it("executes eval code via -e flag", async () => {
    const { execa } = await import("execa");
    vi.mocked(execa).mockResolvedValueOnce({
      all: "hello",
      exitCode: 0,
    } as never);

    const result = await command.execute(
      ["-e", "console.log('hello')"],
      mockCtx,
    );

    expect(result.exitCode).toBe(0);
    expect(vi.mocked(execa)).toHaveBeenCalledWith(
      process.execPath,
      ["-e", "console.log('hello')"],
      expect.any(Object),
    );
  });

  it("executes eval code via --eval flag", async () => {
    const { execa } = await import("execa");
    vi.mocked(execa).mockResolvedValueOnce({
      all: "hello",
      exitCode: 0,
    } as never);

    const result = await command.execute(
      ["--eval", "console.log('hello')"],
      mockCtx,
    );

    expect(result.exitCode).toBe(0);
    expect(vi.mocked(execa)).toHaveBeenCalledWith(
      process.execPath,
      ["-e", "console.log('hello')"],
      expect.any(Object),
    );
  });

  it("passes script args after the file path", async () => {
    const { execa } = await import("execa");
    vi.mocked(execa).mockResolvedValueOnce({
      all: "",
      exitCode: 0,
    } as never);

    await command.execute(
      ["./scripts/build.js", "--output", "./dist", "--verbose"],
      mockCtx,
    );

    const calledArgs = vi.mocked(execa).mock.calls.at(-1)?.[1];
    expect(calledArgs).toEqual(
      expect.arrayContaining(["--output", "./dist", "--verbose"]),
    );
  });

  it("passes node flags before the file path", async () => {
    const { execa } = await import("execa");
    vi.mocked(execa).mockResolvedValueOnce({
      all: "",
      exitCode: 0,
    } as never);

    await command.execute(
      ["--max-old-space-size=4096", "./scripts/build.js"],
      mockCtx,
    );

    const calledArgs = vi.mocked(execa).mock.calls.at(-1)?.[1];
    assert(Array.isArray(calledArgs), "expected args array");
    const fileIndex = calledArgs.findIndex((a) =>
      String(a).includes("build.js"),
    );
    const flagIndex = calledArgs.findIndex((a) =>
      String(a).includes("max-old-space-size"),
    );
    expect(flagIndex).toBeGreaterThanOrEqual(0);
    expect(flagIndex).toBeLessThan(fileIndex);
  });

  describe("path escape prevention", () => {
    it.each([
      ["../../../etc/passwd", "dot-dot traversal from root cwd"],
      ["../../etc/passwd", "dot-dot traversal from nested cwd"],
      ["/etc/passwd", "absolute path outside appDir"],
      ["~/secret.js", "tilde home path"],
    ])("clamps %s (%s) inside appDir", async (filePath, _desc) => {
      const { execa } = await import("execa");
      vi.mocked(execa).mockResolvedValueOnce({
        all: "",
        exitCode: 0,
      } as never);

      await command.execute([filePath], mockCtx);

      const calledArgs = vi.mocked(execa).mock.calls.at(-1)?.[1];
      assert(Array.isArray(calledArgs), "expected args array");
      expect(calledArgs[0]).toMatch(new RegExp(`^${appConfig.appDir}`));
    });

    it("clamps dot-dot traversal from a nested cwd inside appDir", async () => {
      const { execa } = await import("execa");
      vi.mocked(execa).mockResolvedValueOnce({
        all: "",
        exitCode: 0,
      } as never);

      const nestedCtx: CommandContext = { ...mockCtx, cwd: "/scripts" };
      await command.execute(["../../../etc/passwd"], nestedCtx);

      const calledArgs = vi.mocked(execa).mock.calls.at(-1)?.[1];
      assert(Array.isArray(calledArgs), "expected args array");
      expect(calledArgs[0]).toMatch(new RegExp(`^${appConfig.appDir}`));
    });
  });
});
