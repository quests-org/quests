import { parseCommandString } from "execa";
import { err, ok, type Result } from "neverthrow";
import { type NormalizedPackageJson, readPackage } from "read-pkg";

import { type AppDir } from "../schemas/paths";
import { absolutePathJoin } from "./absolute-path-join";
import { type AppConfig } from "./app-config/types";
import { readShim } from "./read-shim";

interface RuntimeConfig {
  detect: (appDir: string) => boolean | Promise<boolean>;
  devCommand: (options: {
    appDir: AppDir;
    port: number;
  }) => Promise<null | string[]>;
  envVars: (options: { port: number }) => Record<string, string>;
  installCommand: (appConfig: AppConfig) => string[];
}

function defaultInstallCommand(appConfig: AppConfig) {
  return appConfig.type === "version" || appConfig.type === "sandbox"
    ? // These app types are nested in the project directory, so we need
      // to ignore the workspace config otherwise PNPM may not install the
      // dependencies correctly
      [appConfig.workspaceConfig.pnpmBinPath, "install", "--ignore-workspace"]
    : [appConfig.workspaceConfig.pnpmBinPath, "install"];
}

async function detectJavaScriptRuntime(
  appDir: string,
  expectedCommand: string,
): Promise<boolean> {
  try {
    const pkg: NormalizedPackageJson = await readPackage({ cwd: appDir });
    const script = pkg.scripts?.dev;
    if (!script) {
      return false;
    }

    const [commandName] = parseCommandString(script);
    return commandName === expectedCommand;
  } catch {
    return false;
  }
}

function getBinShimPath(appDir: AppDir, command: string) {
  return absolutePathJoin(appDir, "node_modules", ".bin", command);
}

const RUNTIME_CONFIGS: Record<string, RuntimeConfig> = {
  nextjs: {
    detect: (appDir) => detectJavaScriptRuntime(appDir, "next"),
    devCommand: async ({ appDir, port }) => {
      const binPath = await readShim(getBinShimPath(appDir, "next"));
      if (!binPath) {
        return null;
      }
      return [binPath, "-p", port.toString()];
    },
    envVars: ({ port }) => ({
      PORT: port.toString(),
    }),
    installCommand: defaultInstallCommand,
  },

  nuxt: {
    detect: (appDir: string) => detectJavaScriptRuntime(appDir, "nuxt"),
    devCommand: async ({ appDir, port }) => {
      const binPath = await readShim(getBinShimPath(appDir, "nuxt"));
      if (!binPath) {
        return null;
      }
      return [binPath, "dev", "--port", port.toString()];
    },
    envVars: ({ port }) => ({
      PORT: port.toString(),
    }),
    installCommand: defaultInstallCommand,
  },

  vite: {
    detect: (appDir: string) => detectJavaScriptRuntime(appDir, "vite"),
    devCommand: async ({ appDir, port }) => {
      const binPath = await readShim(getBinShimPath(appDir, "vite"));
      if (!binPath) {
        return null;
      }
      return [
        binPath,
        "--port",
        port.toString(),
        "--strictPort",
        "--clearScreen",
        "false",
        // Avoids logging confusing localhost and port info
        "--logLevel",
        "warn",
      ];
    },
    envVars: () => ({}),
    installCommand: defaultInstallCommand,
  },
};

interface RuntimeDetectionError {
  message: string;
  scriptName?: string;
}

export async function detectRuntimeTypeFromDirectory(
  appDir: string,
): Promise<Result<string, RuntimeDetectionError>> {
  try {
    const pkg: NormalizedPackageJson = await readPackage({ cwd: appDir });
    const scriptName = "dev";
    const script = pkg.scripts?.[scriptName];

    if (!script) {
      return err({
        message: `Script "${scriptName}" not found in package.json`,
        scriptName,
      });
    }

    const [commandName] = parseCommandString(script);

    for (const [runtimeType, config] of Object.entries(RUNTIME_CONFIGS)) {
      if (runtimeType !== "unknown" && (await config.detect(appDir))) {
        return ok(runtimeType);
      }
    }

    return err({
      message: `Unsupported command "${commandName ?? "missing"}" for script "${scriptName}" in package.json. Supported commands: vite, next, nuxt`,
      scriptName,
    });
  } catch (error) {
    return err({
      message: `Failed to read package.json: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export function getRuntimeConfigByType(runtimeType: string) {
  return RUNTIME_CONFIGS[runtimeType];
}
