import eslintPluginBetterTailwindcss from "eslint-plugin-better-tailwindcss";
import tseslint from "typescript-eslint";

import { ERROR_IN_CI } from "./base";
import reactConfig from "./react";

const config: ReturnType<typeof tseslint.config> = tseslint.config(
  ...reactConfig,
  {
    extends: [eslintPluginBetterTailwindcss.configs.recommended],
    rules: {
      // Too slow to run live and not worth enforcing in CI. Instead, we turn this on manually occasionally and --fix.
      "better-tailwindcss/enforce-canonical-classes": "off",
      // Causes formatting infinite loop due to Prettier conflicting
      // Also, bad for LLMs, which will rarely generate accurate wrapping
      "better-tailwindcss/enforce-consistent-line-wrapping": "off",
      "better-tailwindcss/no-unknown-classes": [
        // Slow rule
        ERROR_IN_CI,
        {
          ignore: ["shiny-text", "toaster", "dark"],
        },
      ],
    },
  },
);

export default config;
