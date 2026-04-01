import { defineCommand } from "just-bash";

import type { AppConfig } from "../app-config/types";

import { absolutePathJoin } from "../absolute-path-join";
import { PNPM_NAME, runPnpmCommand } from "../run-pnpm";
import { createTsCommand, TS_COMMAND } from "./ts";

export const PNPM_COMMAND = {
  description: "CLI tool for managing JavaScript packages.",
  name: PNPM_NAME,
} as const;

// Skip auto-install when the subcommand is itself a package management operation
const PACKAGE_MANAGEMENT_SUBCOMMANDS = new Set([
  "add",
  "dedupe",
  "fetch",
  "i", // short for install
  "import",
  "install",
  "install-test",
  "it", // short for install-test
  "link",
  "ln", // short for link
  "prune",
  "rb", // short for rebuild
  "rebuild",
  "remove",
  "rm", // short for remove
  "uninstall",
  "unlink",
  "up", // short for update
  "update",
]);

export function createPnpmCommand(appConfig: AppConfig) {
  const tsCommand = createTsCommand(appConfig);

  return defineCommand(PNPM_COMMAND.name, async (args, ctx) => {
    const subcommand = args[0];
    const secondArg = args[1];

    // Forward `pnpm exec tsx ...` or `pnpm tsx ...`
    // to the ts command so path sandboxing and provider env are applied correctly.
    if (subcommand === "exec" && secondArg === TS_COMMAND.name) {
      return tsCommand.execute(args.slice(2), ctx);
    }
    if (subcommand === TS_COMMAND.name) {
      return tsCommand.execute(args.slice(1), ctx);
    }

    if (subcommand === "dev" || subcommand === "start") {
      return {
        exitCode: 1,
        stderr: `Quests already starts and runs the apps for you. You don't need to run '${PNPM_COMMAND.name} ${subcommand}'.`,
        stdout: "",
      };
    }

    if (
      subcommand === "run" &&
      (secondArg === "dev" || secondArg === "start")
    ) {
      return {
        exitCode: 1,
        stderr: `Quests already starts and runs the apps for you. You don't need to run '${PNPM_COMMAND.name} run ${secondArg}'.`,
        stdout: "",
      };
    }

    // Too dangerous to allow, because it can run arbitrary binaries
    if (subcommand === "exec") {
      return {
        exitCode: 1,
        stderr: `'${PNPM_COMMAND.name} exec' is not allowed. Use '${TS_COMMAND.name}' to run scripts directly.`,
        stdout: "",
      };
    }

    const env = Object.fromEntries(ctx.env);

    let installOutput = "";
    if (!subcommand || !PACKAGE_MANAGEMENT_SUBCOMMANDS.has(subcommand)) {
      const installResult = await runPnpmCommand({
        appConfig,
        args: ["install"],
        env,
        signal: ctx.signal,
      });
      if (installResult.exitCode !== 0) {
        installOutput = `[auto-install failed]\n${installResult.combined}\n\n`;
      }
    }

    const cwd = absolutePathJoin(appConfig.appDir, ctx.cwd);
    const result = await runPnpmCommand({
      appConfig,
      args,
      cwd,
      env,
      signal: ctx.signal,
      stdin: ctx.stdin || undefined,
    });
    return {
      exitCode: result.exitCode,
      stderr: "",
      stdout: installOutput + result.combined,
    };
  });
}
