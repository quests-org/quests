import { ok, ResultAsync, safeTry } from "neverthrow";

import { type AbsolutePath } from "../schemas/paths";
import { filterIgnoredFiles } from "./filter-ignored-files";
import { generateTreeString } from "./generate-tree-string";
import { getIgnore } from "./get-ignore";

export function fileTree(
  rootDir: AbsolutePath,
  options: { signal: AbortSignal },
) {
  return safeTry<
    string,
    { message: string; type: "filter-error" | "ignore-error" }
  >(async function* () {
    const safeGetIgnore = ResultAsync.fromThrowable(
      () => getIgnore(rootDir, options),
      (error) => ({
        message: error instanceof Error ? error.message : String(error),
        type: "ignore-error" as const,
      }),
    );

    const ig = yield* safeGetIgnore();

    const safeFilterIgnoredFiles = ResultAsync.fromThrowable(
      () => filterIgnoredFiles({ ignore: ig, rootDir }),
      (error) => ({
        message: error instanceof Error ? error.message : String(error),
        type: "filter-error" as const,
      }),
    );

    const files = yield* safeFilterIgnoredFiles();

    return ok(generateTreeString(files));
  });
}
