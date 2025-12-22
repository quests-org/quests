import eslintPluginBetterTailwindcss from "eslint-plugin-better-tailwindcss";
import tseslint from "typescript-eslint";

import reactConfig from "./react";

const config: ReturnType<typeof tseslint.config> = tseslint.config(
  ...reactConfig,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    ignores: [".vite", "coverage", "out"],
    plugins: {
      "better-tailwindcss": eslintPluginBetterTailwindcss,
    },
    rules: {
      // enable all recommended rules to report a warning
      ...eslintPluginBetterTailwindcss.configs["recommended-warn"]?.rules,
      // enable all recommended rules to report an error
      ...eslintPluginBetterTailwindcss.configs["recommended-error"]?.rules,
      // Causes formatting infinite loop due to Prettier conflicting
      "better-tailwindcss/enforce-consistent-line-wrapping": "off",
      "better-tailwindcss/no-unregistered-classes": [
        "warn",
        {
          ignore: ["shiny-text", "toaster"],
        },
      ],
    },
  },
);

export default config;
