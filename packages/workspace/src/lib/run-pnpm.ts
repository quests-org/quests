import { type AbsolutePath } from "../schemas/paths";
import { type AppConfig } from "./app-config/types";
import { execaNodeForApp } from "./execa-node-for-app";
import { filterShellOutput } from "./filter-shell-output";

export const PNPM_NAME = "pnpm";

export async function runPnpmCommand({
  appConfig,
  args,
  cwd,
  env,
  signal,
}: {
  appConfig: AppConfig;
  args: string[];
  cwd?: AbsolutePath;
  env?: Record<string, string>;
  signal?: AbortSignal;
}) {
  const execResult = await execaNodeForApp(
    appConfig,
    appConfig.workspaceConfig.pnpmBinPath,
    args,
    // Don't reject so we can filter the output
    { all: true, cancelSignal: signal, env, reject: false },
    cwd,
  );
  const combined = filterShellOutput(execResult.all, appConfig.appDir);
  return {
    combined,
    command: `${PNPM_NAME} ${args.join(" ")}`,
    exitCode: execResult.exitCode ?? 1,
  };
}
