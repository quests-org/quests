import type { KnipConfig } from "knip";

const config: KnipConfig = {
  ignore: ["registry/**/*"],
  workspaces: {
    ".": {
      // Required because tailwindcss is loaded in root by Knip because of
      // eslint-plugin-better-tailwindcss
      entry: ["scripts/*.ts"],
      ignoreDependencies: ["tailwindcss"],
    },
    "apps/api": {
      entry: ["scripts/*.{ts,tsx}"],
    },
    "apps/studio": {
      entry: [
        "scripts/*.{ts,tsx,js}",
        "src/client/components/ui/*.tsx",
        "src/client/routeTree.gen.ts",
        "src/client/router.tsx",
        "src/client/main.tsx",
        "src/electron-main/index.ts",
        "src/electron-preload/index.ts",
        "electron.vite.config.ts",
        "src/index.html",
        "electron-builder.ts",
        "validate-env.ts",
      ],
      ignore: ["fixtures/**/*", "templates/**/*", "__mocks__/**/*"],
      ignoreBinaries: ["tail", "op"],
      ignoreDependencies: [
        "dugite", // Needed to ensure the git binary is available
        "@vscode/ripgrep", // Maybe needed to ensure the ripgrep binary is available
        "babel-plugin-react-compiler", // Used in electron.vite.config.ts as Babel plugin
      ],
      paths: {
        "@/*": ["src/*"],
      },
      postcss: true, // Not getting picked up by the plugin
    },
    "packages/components": {
      entry: ["index.html", "src/main.tsx"],
      ignoreDependencies: ["tailwindcss"],
    },
    "packages/eslint-config": {
      ignore: ["ignore.ts"],
    },
    "packages/shim-client": {
      entry: ["src/client/index.ts", "src/iframe/index.tsx"],
    },
    "packages/typescript-config": {},
    "packages/workspace": {
      entry: ["__mocks__/*"],
      ignore: ["fixtures/**/*"],
    },
  },
};

export default config;
