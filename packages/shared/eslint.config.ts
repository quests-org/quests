import type { ConfigArray } from "@quests/eslint-config/base";

import baseConfig from "@quests/eslint-config/base";
import { globalIgnores } from "eslint/config";

export default [
  globalIgnores(["coverage", "*.local"]),
  ...baseConfig,
] satisfies ConfigArray;
