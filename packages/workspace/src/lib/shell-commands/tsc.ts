import { defineCommand } from "just-bash";

import type { AppConfig } from "../app-config/types";

import { absolutePathJoin } from "../absolute-path-join";
import { filterShellOutput } from "../filter-shell-output";
import { runNodeModulesBin } from "../run-node-modules-bin";

export const TSC_COMMAND = {
  description:
    "TypeScript compiler for type-checking. Do not pass individual file paths -- this bypasses tsconfig.json and skips the project's compiler settings.",
  name: "tsc",
} as const;

export function createTscCommand(appConfig: AppConfig) {
  return defineCommand("tsc", async (args, ctx) => {
    const cwd = absolutePathJoin(appConfig.appDir, ctx.cwd);
    const binResult = await runNodeModulesBin(
      appConfig,
      "tsc",
      args,
      {
        all: true,
        cancelSignal: ctx.signal,
        env: Object.fromEntries(ctx.env),
        ...(ctx.stdin && { input: ctx.stdin }),
        // Don't reject so we can filter the output
        reject: false,
      },
      cwd,
    );
    if (binResult.isErr()) {
      return { exitCode: 1, stderr: binResult.error.message, stdout: "" };
    }
    const execResult = await binResult.value;
    const combined = filterShellOutput(execResult.all, appConfig.appDir);
    return {
      exitCode: execResult.exitCode ?? 1,
      stderr: "",
      stdout: combined,
    };
  });
}
