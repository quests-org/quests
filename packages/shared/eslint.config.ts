import type { ConfigArray } from "@quests/eslint-config/base";

import baseConfig from "@quests/eslint-config/base";

export default [
  ...baseConfig,
  {
    ignores: ["coverage", "*.local"],
  },
] satisfies ConfigArray;
