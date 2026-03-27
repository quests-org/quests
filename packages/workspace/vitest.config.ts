import { createRequire } from "node:module";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);

export default defineConfig({
  define: {
    __FFMPEG_STATIC_PATH__: JSON.stringify(require.resolve("ffmpeg-static")),
    __FFPROBE_STATIC_PATH__: JSON.stringify(
      require.resolve("@derhuerst/ffprobe-static"),
    ),
  },
  test: {
    clearMocks: true,
    exclude: ["node_modules", "*.local"],
    typecheck: {
      enabled: true,
      ignoreSourceErrors: true,
    },
  },
});
