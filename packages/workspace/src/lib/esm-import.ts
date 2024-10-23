import { pathToFileURL } from "node:url";

export function esmImport(path: string) {
  // on windows import("C:\\path\\to\\file") is not valid, so we need to use file:// URLs
  return process.platform === "win32" ? pathToFileURL(path).toString() : path;
}
