import { type IGitBufferResult } from "dugite";
import path from "node:path";

export const exec = (
  args: string[],
  targetPath: string,
): Promise<IGitBufferResult> => {
  const normalizedPath = targetPath.split(path.sep).join("/");
  return Promise.resolve({
    exitCode: 0,
    stderr: Buffer.from(""),
    stdout: Buffer.from(
      `${args.join(" ")} executed successfully in ${normalizedPath}`,
    ),
  });
};

export const parseError = (): null | string => {
  return null;
};

export type {
  GitError,
  IGitBufferExecutionOptions,
  IGitBufferResult,
} from "dugite";
