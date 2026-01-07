import { ok } from "neverthrow";

import { executeError } from "./execute-error";
import { fixRelativePath } from "./fix-relative-path";

export function ensureRelativePath(inputPath: string) {
  const fixedPath = fixRelativePath(inputPath);
  if (!fixedPath) {
    return executeError(`Path is not relative: ${inputPath}`);
  }
  return ok(fixedPath);
}
