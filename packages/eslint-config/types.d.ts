// Until they are supported, we add them ourselves.
// https://github.com/eslint-community/eslint-plugin-eslint-comments/issues/214
declare module "@eslint-community/eslint-plugin-eslint-comments/configs" {
  import type { Linter } from "eslint";

  const recommended: Linter.Config;
  export = { recommended };
}

// It's Meta, they may never support TypeScript.
declare module "eslint-plugin-react-hooks" {
  import type { Linter } from "eslint";

  const recommended: Linter.Config;
  export = { configs: { recommended } };
}
