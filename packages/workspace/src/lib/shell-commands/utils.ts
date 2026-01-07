import { err, ok } from "neverthrow";

export function executeError(message: string) {
  return err({ message, type: "execute-error" as const });
}

export function shellSuccess(command: string) {
  return ok({ command, exitCode: 0, stderr: "", stdout: "" });
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
