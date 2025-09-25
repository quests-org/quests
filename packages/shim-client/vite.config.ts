import {
  SHIM_IFRAME_BASE_PATH,
  SHIM_SCRIPTS,
} from "@quests/workspace/for-shim";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

function removeExtension(fileName: string) {
  return path.basename(fileName, path.extname(fileName));
}

export default defineConfig({
  base: SHIM_IFRAME_BASE_PATH,
  build: {
    rollupOptions: {
      input: {
        [removeExtension(SHIM_SCRIPTS.iframeHTML)]: "./index.html",
        [removeExtension(SHIM_SCRIPTS.shimJS)]: "./src/client/index.ts",
      },
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
  plugins: [
    react(),
    cssInjectedByJsPlugin({
      // Only inject CSS into the iframe entry
      jsAssetsFilterFunction: (outputChunk) => {
        return outputChunk.fileName === SHIM_SCRIPTS.iframeJS;
      },
    }),
    {
      generateBundle(_options, bundle) {
        const expectedFiles = [SHIM_SCRIPTS.iframeJS, SHIM_SCRIPTS.shimJS];

        const jsFiles = Object.keys(bundle).filter(
          (fileName) =>
            fileName.endsWith(".js") && bundle[fileName]?.type === "chunk",
        );

        const unexpectedFiles = jsFiles.filter(
          (file) =>
            !expectedFiles.includes(file as (typeof expectedFiles)[number]),
        );
        const missingFiles = expectedFiles.filter(
          (file) => !jsFiles.includes(file),
        );

        if (unexpectedFiles.length > 0) {
          throw new Error(
            `Build failed: Unexpected JS files found: ${unexpectedFiles.join(", ")}. Only ${expectedFiles.join(" and ")} are allowed.`,
          );
        }

        if (missingFiles.length > 0) {
          throw new Error(
            `Build failed: Missing expected JS files: ${missingFiles.join(", ")}`,
          );
        }
      },
      name: "validate-javascript-files",
    },
  ],
});
