import { type Options } from "execa";
import { err, ok } from "neverthrow";

import { absolutePathJoin } from "./absolute-path-join";
import { type AppConfig } from "./app-config/types";
import { TypedError } from "./errors";
import { execaNodeForApp } from "./execa-node-for-app";
import { readPNPMShim } from "./read-pnpm-shim";

export async function runNodeModulesBin<
  OptionsType extends Omit<Options, "cwd"> = Omit<Options, "cwd">,
>(appConfig: AppConfig, bin: string, args: string[], options?: OptionsType) {
  const shimPath = absolutePathJoin(
    appConfig.appDir,
    "node_modules",
    ".bin",
    bin,
  );
  const binPathResult = await readPNPMShim(shimPath);

  if (binPathResult.isErr()) {
    return err(binPathResult.error);
  }

  const binPath = binPathResult.value;

  try {
    return ok(
      execaNodeForApp(appConfig, binPath, args, {
        cwd: appConfig.appDir,
        ...options,
      } as unknown as OptionsType & { cwd: string }),
    );
  } catch (error) {
    return err(
      new TypedError.NotFound(
        `Failed to execute ${bin}: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  }
}
