import { execa, type Options } from "execa";

import { type AppConfig } from "./app-config/types";

export function execaNodeForApp<
  OptionsType extends Omit<Options, "cwd"> = Omit<Options, "cwd">,
>(
  appConfig: AppConfig,
  file: string | URL,
  arguments_?: readonly string[],
  options?: OptionsType,
) {
  return execa(file, arguments_, {
    ...options,
    cwd: appConfig.appDir,
    env: {
      ...options?.env,
      ...appConfig.workspaceConfig.nodeExecEnv,
    },
    node: true,
    stdin: options?.stdin ?? "ignore",
    // Ensures callers can use stderr and stdout without null check
  } as unknown as OptionsType & {
    cwd: string;
    env: Record<string, string>;
    node: true;
  });
}
