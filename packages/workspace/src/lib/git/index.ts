import {
  exec,
  type IGitBufferExecutionOptions,
  type IGitBufferResult,
  parseError,
} from "dugite";
import { errAsync, okAsync, ResultAsync } from "neverthrow";

import { GIT_AUTHOR } from "../../constants";
import { type AbsolutePath } from "../../schemas/paths";
import { TypedError } from "../errors";
import { descriptionForGitError } from "./description-for-git-error";

export function git(
  args: string[],
  path: AbsolutePath,
  options: Omit<IGitBufferExecutionOptions, "encoding">,
): ResultAsync<IGitBufferResult, TypedError.Git> {
  return ResultAsync.fromPromise(
    // cspell:ignore quotepath
    // core.quotepath=false prevents git from octal-escaping non-ASCII characters
    // in filenames (e.g. the narrow no-break space U+202F in macOS screenshot names)
    exec(["-c", "core.quotepath=false", ...args], path, {
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
    (error) => new TypedError.Git(String(error), { cause: error }),
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
        return errAsync(
          new TypedError.Git(message, { cause: result, dugiteCode: code }),
        );
      }

      const message = `Unknown git error for: ${args.join(" ")}`;
      const errorDetails = {
        args,
        exitCode: result.exitCode,
        stderr: result.stderr.toString("utf8"),
        stdout: result.stdout.toString("utf8"),
      };
      return errAsync(new TypedError.Git(message, { cause: errorDetails }));
    }
    return okAsync(result);
  });
}
