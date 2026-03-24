import { ok } from "neverthrow";

import type { AppConfig } from "../app-config/types";

import { type AbsolutePath } from "../../schemas/paths";
import { execaNodeForApp } from "../execa-node-for-app";
import { executeError } from "../execute-error";
import { filterShellOutput } from "../filter-shell-output";
import { type FileOperationResult } from "./types";

export const PNPM_COMMAND = {
  description: "CLI tool for managing JavaScript packages.",
  name: "pnpm",
} as const;

export async function pnpmCommand(
  args: string[],
  appConfig: AppConfig,
  signal?: AbortSignal,
  cwd?: AbsolutePath,
): Promise<FileOperationResult> {
  const subcommand = args[0];
  const secondArg = args[1];

  if (subcommand === "dev" || subcommand === "start") {
    return executeError(
      `Quests already starts and runs the apps for you. You don't need to run '${PNPM_COMMAND.name} ${subcommand}'.`,
    );
  }

  if (subcommand === "run" && (secondArg === "dev" || secondArg === "start")) {
    return executeError(
      `Quests already starts and runs the apps for you. You don't need to run '${PNPM_COMMAND.name} run ${secondArg}'.`,
    );
  }

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
  if (!subcommand || !PACKAGE_MANAGEMENT_SUBCOMMANDS.has(subcommand)) {
    await execaNodeForApp(
      appConfig,
      appConfig.workspaceConfig.pnpmBinPath,
      ["install"],
      { all: true, cancelSignal: signal, reject: false },
    );
  }

  const execResult = await execaNodeForApp(
    appConfig,
    appConfig.workspaceConfig.pnpmBinPath,
    args,
    // Don't reject so we can filter the output
    { all: true, cancelSignal: signal, reject: false },
    cwd,
  );
  const combined = filterShellOutput(execResult.all, appConfig.appDir);
  return ok({
    combined,
    command: `${PNPM_COMMAND.name} ${args.join(" ")}`,
    exitCode: execResult.exitCode ?? 1,
  });
}
