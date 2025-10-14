import { type Info } from "@netlify/build-info/node";
import { parseCommandString } from "execa";
import { err, ok, type Result } from "neverthrow";
import invariant from "tiny-invariant";

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
      errorMessage?: string;
      name: string;
    },
    TypedError.FileSystem | TypedError.NotFound | TypedError.Parse
  >
> {
  const [framework] = frameworks; // First framework is already sorted by accuracy
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

  const binPathResult = await readPNPMShim(
    getBinShimPath(appConfig.appDir, devCommand),
  );

  if (binPathResult.isErr()) {
    return err(binPathResult.error);
  }

  const binPath = binPathResult.value;

  switch (devCommand) {
    case "astro": {
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
    case "nuxt": {
      return ok({
        arguments: [...devCommandArgs, "--port", port.toString()],
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
  appConfig.workspaceConfig.captureEvent("framework.not-supported", {
    framework: framework.name,
  });

  // Falling back to generic --port argument and hopefully it works
  return ok({
    arguments: [...devCommandArgs, "--port", port.toString()],
    command: binPath,
    errorMessage:
      "Unsupported framework, falling back to generic --port argument",
    name: framework.name,
  });
}

function getBinShimPath(appDir: AppDir, command: string) {
  return absolutePathJoin(appDir, "node_modules", ".bin", command);
}
