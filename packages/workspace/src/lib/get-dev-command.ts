import { type Info } from "@netlify/build-info/node";
import { parseCommandString } from "execa";
import { err, ok } from "neverthrow";
import { sort } from "radashi";
import invariant from "tiny-invariant";

import { type AppDir } from "../schemas/paths";
import { absolutePathJoin } from "./absolute-path-join";
import { type AppConfig } from "./app-config/types";
import { TypedError } from "./errors";
import { PackageManager } from "./package-manager";
import { readPNPMShim } from "./read-pnpm-shim";

export async function getDevCommand({
  appConfig,
  buildInfo: { frameworks, packageManager },
  port,
}: {
  appConfig: AppConfig;
  buildInfo: Info;
  port: number;
}) {
  const sortedFrameworks = sort(frameworks, (f) => f.detected.accuracy);
  const [framework] = sortedFrameworks;
  invariant(framework, "No framework found");
  const [devCommand, ...devCommandArgs] = parseCommandString(
    framework.dev?.command ?? "",
  );
  if (!devCommand) {
    return err(
      new TypedError.NotFound(
        "No dev command found in framework configuration",
      ),
    );
  }

  if (packageManager?.name !== PackageManager.PNPM) {
    const commandArgs = ["--port", port.toString()];
    return ok({
      command: packageManager
        ? [
            ...parseCommandString(packageManager.runCommand),
            devCommand,
            ...devCommandArgs,
            ...commandArgs,
          ]
        : [devCommand, ...devCommandArgs, ...commandArgs],
      framework,
    });
  }

  const binPathResult = await readPNPMShim(
    getBinShimPath(appConfig.appDir, devCommand),
  );
  if (binPathResult.isErr()) {
    return err(binPathResult.error);
  }

  const binPath = binPathResult.value;

  switch (devCommand) {
    case "next": {
      return ok({
        command: [binPath, ...devCommandArgs, "-p", port.toString()],
        framework,
      });
    }
    case "nuxt": {
      return ok({
        command: [binPath, ...devCommandArgs, "--port", port.toString()],
        framework,
      });
    }
    case "vite": {
      return ok({
        command: [
          binPath,
          ...devCommandArgs,
          "--port",
          port.toString(),
          "--strictPort",
          "--clearScreen",
          "false",
          "--logLevel",
          "warn",
        ],
        framework,
      });
    }
  }
  return err(
    new TypedError.NotFound(
      `Unsupported dev command: ${devCommand}. Supported commands are: next, nuxt, vite`,
    ),
  );
}

function getBinShimPath(appDir: AppDir, command: string) {
  return absolutePathJoin(appDir, "node_modules", ".bin", command);
}
