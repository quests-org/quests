import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "./apps/studio/vitest.config.ts",
      "./packages/workspace/vitest.config.ts",
      "./packages/ai-gateway/vitest.config.ts",
    ],
  },
});
