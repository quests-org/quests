import type { Plugin } from "vite";

import { ValidateEnv } from "@julr/vite-plugin-validate-env";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzer } from "vite-bundle-analyzer";

const isAnalyzing = process.env.ANALYZE_BUILD === "true";

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
      externalizeDepsPlugin({
        exclude: ["@quests/workspace", "@quests/shared", "@quests/ai-gateway"],
      }),
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
      validateProductionEnv,
      externalizeDepsPlugin(),
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
      validateProductionEnv,
      tanstackRouter({
        autoCodeSplitting: true,
        generatedRouteTree: "./src/client/routeTree.gen.ts",
        routesDirectory: "./src/client/routes",
      }),
      react(),
      tailwindcss(),
      ValidateEnv({ configFile: "./src/client/validate-env" }),
    ],
    resolve,
    root: path.resolve("src"),
  },
});
