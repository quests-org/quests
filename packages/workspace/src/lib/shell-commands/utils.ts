import { ok } from "neverthrow";

import { executeError } from "../execute-error";

export function shellSuccess({
  combined = "",
  command,
}: {
  combined?: string;
  command: string;
}) {
  return ok({ combined, command, exitCode: 0 });
}

export function validateNoGlobs(paths: string[], command: string) {
  for (const path of paths) {
    if (detectGlobPattern(path)) {
      return executeError(
        `${command}: glob patterns are not supported. Found glob pattern in '${path}'. Please specify exact file or directory names.`,
      );
    }
  }
  return ok(undefined);
}

function detectGlobPattern(path: string) {
  const globChars = ["*", "?", "[", "]", "{", "}"];
  return globChars.some((char) => path.includes(char));
}
