import { ok } from "neverthrow";

import type { AppConfig } from "../app-config/types";

import { type AbsolutePath } from "../../schemas/paths";
import { executeError } from "../execute-error";
import { filterShellOutput } from "../filter-shell-output";
import { runNodeModulesBin } from "../run-node-modules-bin";
import { type FileOperationResult } from "./types";

export const TSC_COMMAND = {
  description:
    "TypeScript compiler for type-checking. Do not pass individual file paths -- this bypasses tsconfig.json and skips the project's compiler settings.",
  name: "tsc",
} as const;

export async function tscCommand(
  args: string[],
  appConfig: AppConfig,
  signal?: AbortSignal,
  cwd?: AbsolutePath,
): Promise<FileOperationResult> {
  const binResult = await runNodeModulesBin(
    appConfig,
    "tsc",
    args,
    {
      all: true,
      cancelSignal: signal,
      // Don't reject so we can filter the output
      reject: false,
    },
    cwd,
  );
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
