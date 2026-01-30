import type { ConfigArray } from "@quests/eslint-config/base";

import baseConfig from "@quests/eslint-config/react-with-tailwind";
import { globalIgnores } from "eslint/config";

export default [
  globalIgnores([
    "**/*.snap",
    "*.local",
    "src/client/routeTree.gen.ts",
    "electron.vite.config.*.mjs", // Temporary files created by Vite
    ".vite",
    "coverage",
    "out",
    "fixtures",
    "templates",
    "dist",
    "bin",
    ".tmp",
  ]),
  ...baseConfig,
  {
    settings: {
      "better-tailwindcss": {
        entryPoint: "./src/client/styles/app.css",
      },
    },
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          message:
            "window.open is not allowed in the Electron app. Use shell.openExternal or ExternalLink component instead.",
          object: "window",
          property: "open",
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          message:
            "Raw anchor tags <a> are not allowed the Electron app. Use ExternalLink component instead.",
          selector: "JSXOpeningElement[name.name='a']",
        },
      ],
    },
  },
  {
    files: ["src/{client,shared}/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          message: "@quests/merge-generators cannot run on the client",
          name: "@quests/merge-generators",
        },
        {
          message: "@quests/workspace/electron cannot run on the client",
          name: "@quests/workspace/electron",
        },
        {
          message: "@quests/workspace/for-shim is not intended for the Studio",
          name: "@quests/workspace/for-shim",
        },
        {
          message: "@quests/ai-gateway cannot run on the client",
          name: "@quests/ai-gateway",
        },
      ],
    },
  },
  {
    files: ["src/{electron-main,electron-preload}/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          message: "@quests/workspace/client is only intended for the client",
          name: "@quests/workspace/client",
        },
        {
          message: "@quests/ai-gateway/client is only intended for the client",
          name: "@quests/ai-gateway/client",
        },
      ],
    },
  },
] satisfies ConfigArray;
