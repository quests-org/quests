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
    {
      all: true,
      cancelSignal: signal,
      env: {
        // just-bash sets HOME=/ when a cwd is given. pnpm uses os.homedir() to
        // locate its store and cache, so HOME=/ causes it to write to /Library/...
        // on the host filesystem and record that wrong store path in .modules.yaml.
        // Subsequent pnpm runs then see a store mismatch and try to purge
        // node_modules, which fails without a TTY (ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY).
        ...(process.env.HOME && { HOME: process.env.HOME }),
        ...env,
      },
      // Don't reject so we can filter the output
      reject: false,
    },
    cwd,
  );
  const combined = filterShellOutput(execResult.all, appConfig.appDir);
  return {
    combined,
    command: `${PNPM_NAME} ${args.join(" ")}`,
    exitCode: execResult.exitCode ?? 1,
  };
}
