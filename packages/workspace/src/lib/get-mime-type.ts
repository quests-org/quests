import mime from "mime-types";
import path from "node:path";

const CODE_EXTENSION_OVERRIDES: Record<string, string> = {
  ".cjs": "text/javascript",
  ".cts": "text/typescript",
  ".jsx": "text/jsx",
  ".mjs": "text/javascript",
  ".mts": "text/typescript",
  ".ts": "text/typescript",
  ".tsx": "text/tsx",
};

export function getMimeType(filenameOrFilePath: string) {
  const ext = path.extname(filenameOrFilePath).toLowerCase();

  const override = CODE_EXTENSION_OVERRIDES[ext];
  if (override) {
    return override;
  }

  const mimeType = mime.lookup(filenameOrFilePath);

  return mimeType || "application/octet-stream";
}
