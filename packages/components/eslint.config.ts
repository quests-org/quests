import type { ConfigArray } from "@quests/eslint-config/base";

import baseConfig from "@quests/eslint-config/react";

export default [
  ...baseConfig,
  {
    ignores: ["coverage"],
  },
] satisfies ConfigArray;
