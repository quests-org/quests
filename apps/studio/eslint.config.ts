import type { ConfigArray } from "@quests/eslint-config/base";

import baseConfig from "@quests/eslint-config/react-with-tailwind";
import { globalIgnores } from "eslint/config";

export default [
  globalIgnores([
    "**/*.snap",
    "*.local",
    "src/client/routeTree.gen.ts",
    ".vite",
    "coverage",
    "out",
    "fixtures",
    "templates",
    "dist",
    "bin",
  ]),
  ...baseConfig,
  {
    settings: {
      "better-tailwindcss": {
        entryPoint: "./src/client/styles/app.css",
      },
    },
  },
] satisfies ConfigArray;
