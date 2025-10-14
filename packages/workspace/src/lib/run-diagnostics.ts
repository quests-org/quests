import { ExecaError } from "execa";

import type { AppConfig } from "./app-config/types";

import { cancelableTimeout } from "./cancelable-timeout";
import { runNodeModuleBin } from "./run-pnpm-bin";

export async function runDiagnostics(
  appConfig: AppConfig,
  { signal }: { signal: AbortSignal },
): Promise<string | undefined> {
  const timeout = cancelableTimeout(15_000);
  timeout.start();

  const diagnosticsSignal = AbortSignal.any([
    signal,
    timeout.controller.signal,
  ]);

  // NOTE: Currently running `tsc --noEmit` checks the entire project,
  // not just the specific file. This is a limitation of TypeScript CLI.
  // In the future, this will be replaced with LSP-based diagnostics that
  // can target specific files efficiently.
  const diagnosticsResult = await runNodeModuleBin(
    appConfig.appDir,
    "tsc",
    ["--noEmit"],
    { cancelSignal: diagnosticsSignal },
  );

  timeout.cancel();

  if (diagnosticsResult.isOk()) {
    try {
      const result = await diagnosticsResult.value;
      const stderr = result.stderr?.toString() ?? "";
      const stdout = result.stdout?.toString() ?? "";
      const output = stderr + stdout;
      if (output.trim() && result.exitCode !== 0) {
        return output.trim();
      }
    } catch (error) {
      if (error instanceof ExecaError) {
        // When tsc finds errors, execa throws but we want the output
        // TypeScript errors are in stdout, not stderr
        return typeof error.stdout === "string" ? error.stdout : error.message;
      }
      return error instanceof Error ? error.message : String(error);
    }
  } else {
    return `Failed to run diagnostics\n\n${diagnosticsResult.error.message}`;
  }

  return undefined;
}
