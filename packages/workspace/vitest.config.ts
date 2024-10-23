import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    clearMocks: true,
    exclude: ["node_modules"],
    typecheck: {
      enabled: true,
      ignoreSourceErrors: true,
    },
  },
});
