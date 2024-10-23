import { type RelativePath } from "../schemas/paths";

export function fixRelativePath(path: string): null | RelativePath {
  if (isRepoRelativePath(path)) {
    return path;
  }

  // Check if path starts with a leading slash and convert it to "./"
  if (path.startsWith("/")) {
    path = `.${path}`;
  }

  // Check if path doesn't start with "./" and add it
  if (!path.startsWith("./")) {
    path = `./${path}`;
  }

  if (isRepoRelativePath(path)) {
    return path;
  }

  return null;
}

function isRepoRelativePath(path: string): path is RelativePath {
  // Check if path is a string, starts with './', and doesn't contain any path traversal patterns
  return (
    typeof path === "string" &&
    path.startsWith("./") &&
    !path.includes("../") &&
    !path.includes("//") &&
    !/[<>:"|?*]/.test(path)
  );
}
