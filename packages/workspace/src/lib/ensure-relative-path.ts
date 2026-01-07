import { err, ok } from "neverthrow";

import { fixRelativePath } from "./fix-relative-path";

export function ensureRelativePath(inputPath: string) {
  const fixedPath = fixRelativePath(inputPath);
  if (!fixedPath) {
    return err({
      message: `Path is not relative: ${inputPath}`,
      type: "execute-error" as const,
    });
  }
  return ok(fixedPath);
}
