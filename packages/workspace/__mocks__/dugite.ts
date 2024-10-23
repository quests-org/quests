import { type IGitBufferResult } from "dugite";

// Mock implementation of exec
export const exec = (
  args: string[],
  path: string,
): Promise<IGitBufferResult> => {
  return Promise.resolve({
    exitCode: 0,
    stderr: Buffer.from(""),
    stdout: Buffer.from(`${args.join(" ")} executed successfully in ${path}`),
  });
};

// Mock implementation of parseError
export const parseError = (): null | string => {
  return null;
};

// Re-export types from dugite
export type {
  GitError,
  IGitBufferExecutionOptions,
  IGitBufferResult,
} from "dugite";
