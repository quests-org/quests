import { parseCommandString } from "execa";
import { type NormalizedPackageJson, readPackage } from "read-pkg";

interface RuntimeConfig {
  command: (options: {
    appDir: string;
    port: number;
  }) => Promise<string> | string;
  detect: (appDir: string) => boolean | Promise<boolean>;
  envVars: (options: { port: number }) => Record<string, string>;
  installCommand: null | string;
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
  command: ({ port }) => `pnpm run dev --port ${port}`,
  detect: (): boolean => true,
  envVars: ({ port }) => ({
    PORT: port.toString(),
  }),
  installCommand: "pnpm install",
};

const RUNTIME_CONFIGS: Record<string, RuntimeConfig> = {
  nextjs: {
    command: ({ port }) => `pnpm run dev -p ${port}`,
    detect: (appDir) => detectJavaScriptRuntime(appDir, "next"),
    envVars: ({ port }) => ({
      PORT: port.toString(),
    }),
    installCommand: "pnpm install",
  },

  nuxt: {
    command: ({ port }) => `pnpm run dev --port ${port}`,
    detect: (appDir: string) => detectJavaScriptRuntime(appDir, "nuxt"),
    envVars: ({ port }) => ({
      PORT: port.toString(),
    }),
    installCommand: "pnpm install",
  },

  unknown: UNKNOWN_CONFIG,

  vite: {
    command: ({ port }) => `pnpm run dev --port ${port} --strictPort`,
    detect: (appDir: string) => detectJavaScriptRuntime(appDir, "vite"),
    envVars: () => ({}),
    installCommand: "pnpm install",
  },
};

export async function detectRuntimeTypeFromDirectory(
  appDir: string,
): Promise<string> {
  for (const [runtimeType, config] of Object.entries(RUNTIME_CONFIGS)) {
    if (runtimeType !== "unknown" && (await config.detect(appDir))) {
      return runtimeType;
    }
  }
  return "unknown";
}

export function getRuntimeConfigByType(runtimeType: string): RuntimeConfig {
  return RUNTIME_CONFIGS[runtimeType] ?? UNKNOWN_CONFIG;
}
