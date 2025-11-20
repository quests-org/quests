import type { ConfigArray } from "@quests/eslint-config/base";

import baseConfig from "@quests/eslint-config/base";
import { globalIgnores } from "eslint/config";

export default [
  globalIgnores([
    "**/*.snap",
    "coverage",
    "fixtures",
    "*.vitest-temp.json",
    "*.local",
  ]),
  ...baseConfig,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      "import-x/no-duplicates": "error",
    },
  },
] satisfies ConfigArray;
