import { type Result } from "neverthrow";

export type FileOperationResult = Result<
  { combined: string; command: string; exitCode: number },
  { message: string; type: "execute-error" }
>;
