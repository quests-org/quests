import { createRequire } from "node:module";
import path from "node:path";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);

export default defineConfig({
  define: {
    __AGENT_BROWSER_BIN_DIR__: JSON.stringify(
      path.dirname(require.resolve("agent-browser/bin/agent-browser.js")),
    ),
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
