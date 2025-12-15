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

const validateProductionEnv: Plugin = {
  configResolved(config) {
    if (config.mode !== "production") {
      return;
    }

    const requiredVars = ["VITE_POSTHOG_API_HOST", "VITE_POSTHOG_API_KEY"];
    for (const key of requiredVars) {
      if (!config.env[key]) {
        throw new Error(`Missing environment variable: ${key}`);
      }
    }
  },
  name: "validate-production-env",
};

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
    plugins: [...(isAnalyzing ? [analyzer()] : []), validateProductionEnv],
    resolve,
  },
  preload: {
    build: {
      lib: {
        entry: path.join(process.cwd(), "src/electron-preload/index.ts"),
      },
      watch: {}, // Enable hot reloading
    },
    plugins: [...(isAnalyzing ? [analyzer()] : []), validateProductionEnv],
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
      validateProductionEnv,
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
      ValidateEnv({ configFile: "./src/client/validate-env" }),
    ],
    resolve,
    root: path.resolve("src"),
  },
}));
