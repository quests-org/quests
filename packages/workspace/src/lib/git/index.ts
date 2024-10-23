import {
  type GitError as DugiteGitError,
  exec,
  type IGitBufferExecutionOptions,
  type IGitBufferResult,
  parseError,
} from "dugite";
import { errAsync, okAsync, ResultAsync } from "neverthrow";

import { GIT_AUTHOR } from "../../constants";
import { type AbsolutePath } from "../../schemas/paths";
import { descriptionForGitError } from "./description-for-git-error";

export type GitError =
  | {
      args: string[];
      exitCode: number;
      message: string;
      stderr: string;
      stdout: string;
      type: "unknown-git-error";
    }
  | {
      code: DugiteGitError;
      message: string;
      type: "git";
    }
  | {
      message: string;
      type: "unknown";
    };

export function git(
  args: string[],
  path: AbsolutePath,
  options: Omit<IGitBufferExecutionOptions, "encoding">,
): ResultAsync<IGitBufferResult, GitError> {
  return ResultAsync.fromPromise(
    exec(args, path, {
      ...options,
      encoding: "buffer",
      env: {
        ...options.env,
        // Avoid using the user or system git config files
        GIT_CONFIG_GLOBAL: "",
        GIT_CONFIG_NOSYSTEM: "1",
        // Set git committer info to match our author
        GIT_COMMITTER_EMAIL: GIT_AUTHOR.email,
        GIT_COMMITTER_NAME: GIT_AUTHOR.name,
      },
    }),
    (error) => {
      return {
        message: String(error),
        type: "unknown" as const,
      };
    },
  ).andThen((result) => {
    if (result.exitCode !== 0) {
      const outputStrings = [result.stderr, result.stdout].map((s) =>
        s.toString(),
      );
      const errorOutputs = outputStrings.map((s) => parseError(s));
      const code = errorOutputs.find(Boolean);
      if (code) {
        const stderrString = result.stderr.toString("utf8");
        const message =
          descriptionForGitError(code, stderrString) ??
          `Unknown error code: ${code}, stderr: ${stderrString}`;
        return errAsync({
          code,
          message,
          type: "git" as const,
        });
      }
      return errAsync({
        args,
        exitCode: result.exitCode,
        message: `Unknown git error for: ${args.join(" ")}`,
        stderr: result.stderr.toString("utf8"),
        stdout: result.stdout.toString("utf8"),
        type: "unknown-git-error" as const,
      });
    }
    return okAsync(result);
  });
}
