import { execa, type Options } from "execa";

import { type AppConfig } from "./app-config/types";

export function execaNodeForApp<OptionsType extends Options = Options>(
  appConfig: AppConfig,
  file: string | URL,
  arguments_?: readonly string[],
  options?: OptionsType,
) {
  return execa(file, arguments_, {
    ...options,
    env: {
      ...options?.env,
      ...appConfig.workspaceConfig.nodeExecEnv,
    },
    node: true,
    // Ensures callers can use stderr and stdout without null check
  } as unknown as OptionsType & { env: Record<string, string>; node: true });
}
