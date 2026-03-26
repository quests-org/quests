import { type CommandContext, InMemoryFs } from "just-bash";
import { describe, expect, it, vi } from "vitest";

import { ProjectSubdomainSchema } from "../../schemas/subdomains";
import { createMockAppConfig } from "../../test/helpers/mock-app-config";
import { createPnpmCommand } from "./pnpm";

vi.mock(import("../execa-node-for-app"));

const mockCtx: CommandContext = {
  cwd: "/",
  env: new Map<string, string>(),
  fs: new InMemoryFs(),
  stdin: "",
};

describe("createPnpmCommand", () => {
  const appConfig = createMockAppConfig(ProjectSubdomainSchema.parse("test"));
  const command = createPnpmCommand(appConfig);

  it.each([{ subcommand: "dev" }, { subcommand: "start" }])(
    "errors when trying to run pnpm $subcommand",
    async ({ subcommand }) => {
      const result = await command.execute([subcommand], mockCtx);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toBe(
        `Quests already starts and runs the apps for you. You don't need to run 'pnpm ${subcommand}'.`,
      );
    },
  );

  it.each([{ subcommand: "dev" }, { subcommand: "start" }])(
    "errors when trying to run pnpm run $subcommand",
    async ({ subcommand }) => {
      const result = await command.execute(["run", subcommand], mockCtx);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toBe(
        `Quests already starts and runs the apps for you. You don't need to run 'pnpm run ${subcommand}'.`,
      );
    },
  );

  it("errors when trying to run pnpm exec", async () => {
    const result = await command.execute(
      ["exec", "node", "script.js"],
      mockCtx,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatchInlineSnapshot(
      `"'pnpm exec' is not allowed. Use 'tsx' to run scripts directly."`,
    );
  });

  it("includes auto-install output in stdout when install fails", async () => {
    const { execaNodeForApp } = await import("../execa-node-for-app");
    vi.mocked(execaNodeForApp)
      .mockResolvedValueOnce({
        all: "ERR_PNPM_PEER_DEP_ISSUES",
        exitCode: 1,
      } as never)
      .mockResolvedValueOnce({ all: "script output", exitCode: 0 } as never);

    const result = await command.execute(["run", "build"], mockCtx);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatchInlineSnapshot(`
      "[auto-install failed]
      ERR_PNPM_PEER_DEP_ISSUES

      script output"
    `);
  });

  it.each([
    { args: ["tsx", "-e", "console.log(1)"], form: "pnpm tsx -e ..." },
    {
      args: ["exec", "tsx", "-e", "console.log(1)"],
      form: "pnpm exec tsx -e ...",
    },
  ])("forwards $form to the ts command", async ({ args }) => {
    const { execaNodeForApp } = await import("../execa-node-for-app");
    vi.mocked(execaNodeForApp).mockResolvedValueOnce({
      all: "1",
      exitCode: 0,
    } as never);

    const result = await command.execute(args, mockCtx);

    expect(result.exitCode).toBe(0);
    expect(vi.mocked(execaNodeForApp)).toHaveBeenCalledWith(
      appConfig,
      appConfig.workspaceConfig.pnpmBinPath,
      expect.arrayContaining(["dlx", "jiti"]),
      expect.any(Object),
      expect.any(String),
    );
  });
});
