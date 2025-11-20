import type { ConfigArray } from "@quests/eslint-config/base";

import baseConfig from "@quests/eslint-config/react";
import { globalIgnores } from "eslint/config";

export default [
  globalIgnores(["coverage"]),
  ...baseConfig,
] satisfies ConfigArray;
