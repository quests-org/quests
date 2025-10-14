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

export async function getFramework({
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

  if (packageManager && packageManager.name !== PackageManager.PNPM) {
    return err(
      new TypedError.NotFound(
        `Unsupported package manager ${packageManager.name}`,
      ),
    );
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
        ...framework,
        arguments: [...devCommandArgs, "-p", port.toString()],
        command: binPath,
      });
    }
    case "nuxt": {
      return ok({
        ...framework,
        arguments: [...devCommandArgs, "--port", port.toString()],
        command: binPath,
      });
    }
    case "vite": {
      return ok({
        ...framework,
        arguments: [
          ...devCommandArgs,
          "--port",
          port.toString(),
          "--strictPort",
          "--clearScreen",
          "false",
          "--logLevel",
          "warn",
        ],
        command: binPath,
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
