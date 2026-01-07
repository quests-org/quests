import { err, ok, type Result } from "neverthrow";

export type FileOperationResult = Result<
  { command: string; exitCode: number; stderr: string; stdout: string },
  { message: string; type: "execute-error" }
>;

export function createError(message: string) {
  return err({ message, type: "execute-error" as const });
}

export function createSuccess(command: string) {
  return ok({ command, exitCode: 0, stderr: "", stdout: "" });
}
