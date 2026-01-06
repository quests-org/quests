import { type Options } from "execa";
import { err } from "neverthrow";

import { type AbsolutePath } from "../schemas/paths";
import { type AppConfig } from "./app-config/types";
import { TypedError } from "./errors";
import { execaNodeForApp } from "./execa-node-for-app";
import { readPNPMShim } from "./read-pnpm-shim";

export async function ensurePnpmShim(
  appConfig: AppConfig,
  shimPath: AbsolutePath,
  options?: Pick<Options, "cancelSignal">,
) {
  const shimResult = await readPNPMShim(shimPath);

  if (shimResult.isOk()) {
    return shimResult;
  }

  if (!(shimResult.error instanceof TypedError.ShimNotFound)) {
    return shimResult;
  }

  try {
    await execaNodeForApp(
      appConfig,
      appConfig.workspaceConfig.pnpmBinPath,
      ["install"],
      { cancelSignal: options?.cancelSignal },
    );

    const retryResult = await readPNPMShim(shimPath);
    return retryResult;
  } catch (error) {
    return err(
      new TypedError.ShimNotFound(
        `Failed to install dependencies: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      ),
    );
  }
}
