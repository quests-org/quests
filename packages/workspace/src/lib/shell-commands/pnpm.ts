import { ok } from "neverthrow";

import type { AppConfig } from "../app-config/types";

import { execaNodeForApp } from "../execa-node-for-app";
import { executeError } from "../execute-error";
import { filterShellOutput } from "../filter-shell-output";
import { type FileOperationResult } from "./types";

const COMMAND_NAME = "pnpm";
export const PNPM_COMMAND = {
  description: "CLI tool for managing JavaScript packages.",
  examples: [`${COMMAND_NAME} add <package-name>`],
  name: COMMAND_NAME,
} as const;

export async function pnpmCommand(
  args: string[],
  appConfig: AppConfig,
  signal?: AbortSignal,
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

  const execResult = await execaNodeForApp(
    appConfig,
    appConfig.workspaceConfig.pnpmBinPath,
    args,
    // Don't reject so we can filter the output
    { all: true, cancelSignal: signal, reject: false },
  );
  const combined = filterShellOutput(execResult.all, appConfig.appDir);
  return ok({
    combined,
    command: `${PNPM_COMMAND.name} ${args.join(" ")}`,
    exitCode: execResult.exitCode ?? 0,
  });
}
