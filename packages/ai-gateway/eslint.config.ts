import type { ConfigArray } from "@quests/eslint-config/base";

import baseConfig from "@quests/eslint-config/base";
import { globalIgnores } from "eslint/config";

export default [globalIgnores(["dist"]), ...baseConfig] satisfies ConfigArray;
