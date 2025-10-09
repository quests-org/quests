import { parseCommandString } from "execa";
import { err, ok, type Result } from "neverthrow";
import { type NormalizedPackageJson, readPackage } from "read-pkg";

import { type AppConfig } from "./app-config/types";

interface RuntimeConfig {
  command: (options: {
    appDir: string;
    port: number;
  }) => Promise<string[]> | string[];
  detect: (appDir: string) => boolean | Promise<boolean>;
  envVars: (options: { port: number }) => Record<string, string>;
  installCommand: (appConfig: AppConfig) => string[];
}

function defaultInstallCommand(appConfig: AppConfig) {
  return appConfig.type === "version" || appConfig.type === "sandbox"
    ? // These app types are nested in the project directory, so we need
      // to ignore the workspace config otherwise PNPM may not install the
      // dependencies correctly
      ["pnpm", "install", "--ignore-workspace"]
    : ["pnpm", "install"];
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

const UNKNOWN_CONFIG: RuntimeConfig = {
  command: ({ port }) => ["pnpm", "run", "dev", "--port", port.toString()],
  detect: (): boolean => true,
  envVars: ({ port }) => ({
    PORT: port.toString(),
  }),
  installCommand: defaultInstallCommand,
};

const RUNTIME_CONFIGS: Record<string, RuntimeConfig> = {
  nextjs: {
    command: ({ port }) => ["pnpm", "run", "dev", "-p", port.toString()],
    detect: (appDir) => detectJavaScriptRuntime(appDir, "next"),
    envVars: ({ port }) => ({
      PORT: port.toString(),
    }),
    installCommand: defaultInstallCommand,
  },

  nuxt: {
    command: ({ port }) => ["pnpm", "run", "dev", "--port", port.toString()],
    detect: (appDir: string) => detectJavaScriptRuntime(appDir, "nuxt"),
    envVars: ({ port }) => ({
      PORT: port.toString(),
    }),
    installCommand: defaultInstallCommand,
  },

  unknown: UNKNOWN_CONFIG,

  vite: {
    command: ({ port }) => [
      "pnpm",
      "run",
      "dev",
      "--port",
      port.toString(),
      "--strictPort",
      "--clearScreen",
      "false",
      // Avoids logging confusing localhost and port info
      "--logLevel",
      "warn",
    ],
    detect: (appDir: string) => detectJavaScriptRuntime(appDir, "vite"),
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

export function getRuntimeConfigByType(runtimeType: string): RuntimeConfig {
  return RUNTIME_CONFIGS[runtimeType] ?? UNKNOWN_CONFIG;
}
