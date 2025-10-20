import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    clearMocks: true,
    exclude: ["node_modules", "dist", "directory", "out"],
    setupFiles: ["src/tests/setup.ts"],
  },
});
