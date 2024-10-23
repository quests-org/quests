import eslintPluginBetterTailwindcss from "eslint-plugin-better-tailwindcss";
import tseslint from "typescript-eslint";

import reactConfig from "./react";

const config: ReturnType<typeof tseslint.config> = tseslint.config(
  ...reactConfig,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "better-tailwindcss": eslintPluginBetterTailwindcss,
    },
    rules: {
      // enable all recommended rules to warn
      ...eslintPluginBetterTailwindcss.configs.warning?.rules,
      // enable all recommended rules to error
      ...eslintPluginBetterTailwindcss.configs.error?.rules,
      // Could not fix infinite loop. Maybe enable someday.
      "better-tailwindcss/multiline": "off",
    },
  },
);

export default config;
