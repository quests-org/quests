import type { ConfigArray } from "@quests/eslint-config/base";

import baseConfig from "@quests/eslint-config/base";

export default [
  ...baseConfig,
  {
    ignores: [
      "**/*.snap",
      "coverage",
      "fixtures",
      "*.vitest-temp.json",
      "*.local",
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      "import-x/no-duplicates": "error",
    },
  },
] satisfies ConfigArray;
