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
] satisfies ConfigArray;
