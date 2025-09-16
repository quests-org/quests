import { ok, ResultAsync, safeTry } from "neverthrow";

import { type AbsolutePath } from "../schemas/paths";
import { TypedError } from "./errors";
import { filterIgnoredFiles } from "./filter-ignored-files";
import { generateTreeString } from "./generate-tree-string";
import { getIgnore } from "./get-ignore";

export function fileTree(
  rootDir: AbsolutePath,
  options?: { signal: AbortSignal },
) {
  return safeTry<string, TypedError.FileSystem | TypedError.Parse>(
    async function* () {
      const safeGetIgnore = ResultAsync.fromThrowable(
        () => getIgnore(rootDir, options),
        (error) =>
          new TypedError.Parse(
            error instanceof Error ? error.message : String(error),
            { cause: error },
          ),
      );

      const ig = yield* safeGetIgnore();

      const safeFilterIgnoredFiles = ResultAsync.fromThrowable(
        () => filterIgnoredFiles({ ignore: ig, rootDir }),
        (error) =>
          new TypedError.FileSystem(
            error instanceof Error ? error.message : String(error),
            { cause: error },
          ),
      );

      const files = yield* safeFilterIgnoredFiles();

      return ok(generateTreeString(files));
    },
  );
}
