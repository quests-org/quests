import type { ConfigArray } from "@quests/eslint-config/base";

import baseConfig from "@quests/eslint-config/react-with-tailwind";

export default [
  ...baseConfig,
  {
    ignores: [
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
    ],
  },
] satisfies ConfigArray;
