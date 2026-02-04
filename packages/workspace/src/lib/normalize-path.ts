import path from "node:path";

export function normalizePath(pathString: string): string {
  if (pathString === "") {
    return "";
  }
  const withForwardSlashes = pathString.replaceAll("\\", "/");
  return path.posix.normalize(withForwardSlashes);
}
