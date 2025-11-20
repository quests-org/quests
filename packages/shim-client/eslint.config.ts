import type { ConfigArray } from "@quests/eslint-config/base";

import baseConfig from "@quests/eslint-config/react-with-tailwind";
import { globalIgnores } from "eslint/config";

export default [
  globalIgnores(["dist"]),
  ...baseConfig,
  {
    settings: {
      "better-tailwindcss": {
        entryPoint: "./src/iframe/styles.css",
      },
    },
  },
] satisfies ConfigArray;
