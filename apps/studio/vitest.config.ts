import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    clearMocks: true,
    exclude: ["node_modules", "dist", "directory", "out"],
    setupFiles: ["src/tests/setup.ts"],
  },
});
