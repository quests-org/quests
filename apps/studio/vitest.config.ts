import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig, type Plugin } from "vitest/config";

export default defineConfig({
  // Avoids random type error due to
  // https://github.com/aleclarson/vite-tsconfig-paths/issues/176
  plugins: [tsconfigPaths() as unknown as Plugin],
  test: {
    clearMocks: true,
    exclude: ["node_modules", "dist", "directory", "out"],
    setupFiles: ["src/tests/setup.ts"],
  },
});
