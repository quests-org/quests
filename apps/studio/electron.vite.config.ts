import type { Plugin } from "vite";

import { ValidateEnv } from "@julr/vite-plugin-validate-env";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import path from "node:path";
import { analyzer } from "vite-bundle-analyzer";
import tsconfigPaths from "vite-tsconfig-paths";

const isAnalyzing = process.env.ANALYZE_BUILD === "true";
// Avoids random type error due to
// https://github.com/aleclarson/vite-tsconfig-paths/issues/176
const fixedTsConfigPaths = tsconfigPaths() as unknown as Plugin;

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

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: path.join(process.cwd(), "src/electron-main/index.ts"),
      },
      watch: {}, // Enable hot reloading
    },
    plugins: [
      ...(isAnalyzing ? [analyzer()] : []),
      validateProductionEnv,
      fixedTsConfigPaths,
      externalizeDepsPlugin({
        exclude: ["@quests/workspace", "@quests/shared", "@quests/ai-gateway"],
      }),
    ],
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
      validateProductionEnv,
      fixedTsConfigPaths,
      externalizeDepsPlugin(),
    ],
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
      fixedTsConfigPaths,
      tanstackRouter({
        autoCodeSplitting: true,
        generatedRouteTree: "./src/client/routeTree.gen.ts",
        routesDirectory: "./src/client/routes",
      }),
      react(),
      tailwindcss(),
      ValidateEnv({ configFile: "./src/client/validate-env" }),
    ],
    root: path.resolve("src"),
  },
});
