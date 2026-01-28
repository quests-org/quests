import { ok } from "neverthrow";

import type { AppConfig } from "../app-config/types";

import { executeError } from "../execute-error";
import { filterShellOutput } from "../filter-shell-output";
import { runNodeModulesBin } from "../run-node-modules-bin";
import { type FileOperationResult } from "./types";

const COMMAND_NAME = "tsc";
export const TSC_COMMAND = {
  description: "TypeScript compiler",
  examples: [COMMAND_NAME],
  name: COMMAND_NAME,
} as const;

export async function tscCommand(
  args: string[],
  appConfig: AppConfig,
  signal?: AbortSignal,
): Promise<FileOperationResult> {
  const binResult = await runNodeModulesBin(appConfig, "tsc", args, {
    all: true,
    cancelSignal: signal,
    // Don't reject so we can filter the output
    reject: false,
  });
  if (binResult.isErr()) {
    return executeError(binResult.error.message);
  }
  const execResult = await binResult.value;
  const combined = filterShellOutput(execResult.all, appConfig.appDir);
  return ok({
    combined,
    command: `${TSC_COMMAND.name} ${args.join(" ")}`,
    exitCode: execResult.exitCode ?? 1,
  });
}
