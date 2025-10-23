import { type Info } from "@netlify/build-info/node";
import { parseCommandString } from "execa";
import { err, ok, type Result } from "neverthrow";
import { readPackage } from "read-pkg";

import { type AppDir } from "../schemas/paths";
import { absolutePathJoin } from "./absolute-path-join";
import { type AppConfig } from "./app-config/types";
import { TypedError } from "./errors";
import { readPNPMShim } from "./read-pnpm-shim";

export async function getFramework({
  appConfig,
  buildInfo: { frameworks },
  port,
}: {
  appConfig: AppConfig;
  buildInfo: Info;
  port: number;
}): Promise<
  Result<
    {
      arguments: string[];
      command: string;
      log?: {
        message: string;
        type: "error" | "normal";
      };
      name: string;
    },
    TypedError.FileSystem | TypedError.NotFound | TypedError.Parse
  >
> {
  const [framework] = frameworks; // First framework is already sorted by accuracy

  if (!framework) {
    const packageJson = await readPackage({ cwd: appConfig.appDir });
    const scripts = packageJson.scripts ?? {};
    const scriptName = scripts.dev ? "dev" : scripts.start ? "start" : null;

    if (scriptName) {
      return ok({
        arguments: [scriptName],
        command: appConfig.workspaceConfig.pnpmBinPath,
        log: {
          message: `No framework found, falling back to npm ${scriptName}`,
          type: "normal",
        },
        name: scripts[scriptName] ?? "unknown",
      });
    }

    appConfig.workspaceConfig.captureEvent("framework.not_supported", {
      framework: "unknown",
    });

    return err(
      new TypedError.NotFound(
        "No framework found and no dev or start script in package.json",
      ),
    );
  }

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

  const binPathResult = await readPNPMShim(
    getBinShimPath(appConfig.appDir, devCommand),
  );

  if (binPathResult.isErr()) {
    return err(binPathResult.error);
  }

  const binPath = binPathResult.value;

  switch (devCommand) {
    case "astro":
    case "ng":
    case "nuxt": {
      return ok({
        arguments: [...devCommandArgs, "--port", port.toString()],
        command: binPath,
        name: framework.name,
      });
    }
    case "next": {
      return ok({
        arguments: [...devCommandArgs, "-p", port.toString()],
        command: binPath,
        name: framework.name,
      });
    }
    case "qwik": {
      return ok({
        arguments: [
          ...devCommandArgs,
          "--mode",
          "ssr",
          "--port",
          port.toString(),
        ],
        command: binPath,
        name: framework.name,
      });
    }
    case "vite": {
      return ok({
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
        name: framework.name,
      });
    }
  }
  appConfig.workspaceConfig.captureEvent("framework.not_supported", {
    framework: framework.name,
  });

  // Falling back to generic --port argument and hopefully it works
  return ok({
    arguments: [...devCommandArgs, "--port", port.toString()],
    command: binPath,
    log: {
      message:
        "Unknown framework. if your app does not boot, try using a different framework",
      type: "normal",
    },
    name: framework.name,
  });
}

function getBinShimPath(appDir: AppDir, command: string) {
  return absolutePathJoin(appDir, "node_modules", ".bin", command);
}
