import { type Result } from "neverthrow";

export type FileOperationResult = Result<
  { command: string; exitCode: number; stderr: string; stdout: string },
  { message: string; type: "execute-error" }
>;
