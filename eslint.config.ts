import type { ConfigArray } from "@quests/eslint-config/base";

import baseConfig from "@quests/eslint-config/base";
import { globalIgnores } from "eslint/config";

export default [
  globalIgnores([
    "apps",
    "packages",
    ".turbo",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    ".vite",
    ".tmp",
    "coverage",
    ".next",
    "registry",
  ]),
  ...baseConfig,
  {
    files: [".github/ISSUE_TEMPLATE/**/*.yml"],
    rules: {
      "yml/sort-sequence-values": "off",
    },
  },
] satisfies ConfigArray;
