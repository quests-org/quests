import path from "node:path";

export function normalizePath(pathString: string): string {
  if (pathString === "") {
    return "";
  }
  const withForwardSlashes = pathString.replaceAll("\\", "/");
  return path.posix.normalize(withForwardSlashes);
}

// Use when constructing paths that will be displayed to the agent (e.g. in
// tool output XML). Always produces POSIX separators regardless of the host OS.
export function toAgentPath(...segments: string[]): string {
  return normalizePath(segments.join("/"));
}
