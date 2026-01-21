import type { Plugin } from "vite";

import { ValidateEnv } from "@julr/vite-plugin-validate-env";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readPackage } from "read-pkg";
import { analyzer } from "vite-bundle-analyzer";

const isAnalyzing = process.env.ANALYZE_BUILD === "true";

const monorepoNamespace = "@quests";
// Not including "components" it will be bundled by default in the client
const monorepoPackages = ["workspace", "shared", "ai-gateway"];

async function getMonorepoDeps(packageName: string) {
  const pkg = await readPackage({
    cwd: path.join(process.cwd(), `../../packages/${packageName}`),
  });
  return Object.keys(pkg.dependencies ?? {}).filter(
    (dep) => !dep.startsWith(monorepoNamespace),
  );
}

const monorepoDepsPromises = await Promise.all(
  monorepoPackages.map(getMonorepoDeps),
);
const monorepoDeps = [...new Set(monorepoDepsPromises.flat())];

const mainExternalizeExclude = [
  // Monorepos packages export .ts files, which must be bundled
  ...monorepoPackages.map((pkg) => `${monorepoNamespace}/${pkg}`),
  "execa", // Unsure why this is needed, maybe ESM vs CJS?
];

const resolve = {
  alias: {
    "@": path.join(path.dirname(fileURLToPath(import.meta.url)), "src"),
  },
};

/**
 * Creates a plugin to validate production environment variables based on context.
 *
 * Electron Vite environment variable naming scheme:
 * - KEY=123                # not available
 * - MAIN_VITE_KEY=123      # only available in main process
 * - PRELOAD_VITE_KEY=123   # only available in preload scripts
 * - RENDERER_VITE_KEY=123  # only available in renderers
 * - VITE_KEY=123           # available in all processes
 */
function createValidateProductionEnv(
  context: "main" | "preload" | "renderer",
): Plugin {
  // Map of required environment variables by context
  const requiredVarsByContext = {
    main: ["MAIN_VITE_GOOGLE_CLIENT_ID", "MAIN_VITE_GOOGLE_CLIENT_SECRET"],
    preload: [] as string[],
    renderer: [] as string[],
  };

  // Variables available to all contexts
  const sharedRequiredVars = ["VITE_POSTHOG_API_HOST", "VITE_POSTHOG_API_KEY"];

  return {
    configResolved(config) {
      if (config.mode !== "production") {
        return;
      }

      const contextVars = requiredVarsByContext[context];
      const allRequiredVars = [...sharedRequiredVars, ...contextVars];

      for (const key of allRequiredVars) {
        if (!config.env[key]) {
          throw new Error(
            `Missing environment variable for ${context}: ${key}`,
          );
        }
      }
    },
    name: `validate-production-env:${context}`,
  };
}

export default defineConfig(({ command }) => ({
  main: {
    build: {
      externalizeDeps: {
        exclude: mainExternalizeExclude,
        include:
          // In dev, we must include all dependencies
          command === "serve"
            ? []
            : monorepoDeps.filter(
                (dep) => !mainExternalizeExclude.includes(dep),
              ),
      },
      lib: {
        entry: path.join(process.cwd(), "src/electron-main/index.ts"),
      },
      rollupOptions: {
        onwarn(warning, warn) {
          if (
            warning.code === "UNUSED_EXTERNAL_IMPORT" &&
            warning.message.includes("ZodFirstPartyTypeKind")
          ) {
            // Suppresses "ZodFirstPartyTypeKind" is imported from external module "zod" but never used
            // Due to OpenRouter AI SDK Provider using older Zod
            // Remove this if they update https://github.com/OpenRouterTeam/ai-sdk-provider
            return;
          }
          warn(warning);
        },
      },
      watch: {}, // Enable hot reloading
    },
    plugins: [
      ...(isAnalyzing ? [analyzer()] : []),
      createValidateProductionEnv("main"),
      ValidateEnv({ configFile: "./validate-env" }),
    ],
    resolve,
  },
  preload: {
    build: {
      lib: {
        entry: path.join(process.cwd(), "src/electron-preload/index.ts"),
      },
      watch: {}, // Enable hot reloading
    },
    plugins: [
      ...(isAnalyzing ? [analyzer()] : []),
      createValidateProductionEnv("preload"),
    ],
    resolve,
  },
  renderer: {
    build: {
      rollupOptions: {
        input: {
          browser: path.join(process.cwd(), "src/index.html"),
        },
      },
      watch: {}, // Enable hot reloading
    },
    plugins: [
      ...(isAnalyzing ? [analyzer()] : []),
      createValidateProductionEnv("renderer"),
      tanstackRouter({
        autoCodeSplitting: true,
        generatedRouteTree: "./src/client/routeTree.gen.ts",
        routesDirectory: "./src/client/routes",
      }),
      react({
        babel: {
          plugins: ["babel-plugin-react-compiler"],
        },
      }),
      tailwindcss(),
    ],
    resolve,
    root: path.resolve("src"),
  },
}));
