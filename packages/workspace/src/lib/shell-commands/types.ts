import { type Result } from "neverthrow";

export type FileOperationResult = Result<
  { command: string; exitCode: number; output: string },
  { message: string; type: "execute-error" }
>;
