import { type Options } from "execa";
import { err } from "neverthrow";
import { dedent } from "radashi";

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

  if (shimResult.error.type !== "workspace-shim-not-found-error") {
    return shimResult;
  }

  let installError: unknown;
  try {
    await execaNodeForApp(
      appConfig,
      appConfig.workspaceConfig.pnpmBinPath,
      ["install"],
      { cancelSignal: options?.cancelSignal },
    );
  } catch (error) {
    installError = error;
  }

  const retryResult = await readPNPMShim(shimPath);

  if (retryResult.isOk()) {
    return retryResult;
  }

  const hadInstallError = installError !== undefined;
  const installErrorMessage = hadInstallError
    ? `\n\nInstall error: ${installError instanceof Error ? installError.message : String(installError)}`
    : "";

  return err(
    new TypedError.DependencyInstall(
      dedent`
        The pnpm shim was not found at the expected location. This typically means 'pnpm install' has not completed successfully.
        
        An attempt was just made to run 'pnpm install' to create the shim, but it ${hadInstallError ? "failed" : "did not resolve the issue"}.${installErrorMessage}
        
        Review the error details above to determine the best course of action.
      `,
      { cause: installError ?? undefined },
    ),
  );
}
