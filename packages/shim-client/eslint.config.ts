import type { ConfigArray } from "@quests/eslint-config/base";

import baseConfig from "@quests/eslint-config/react-with-tailwind";

export default [...baseConfig, { ignores: ["dist"] }] satisfies ConfigArray;
