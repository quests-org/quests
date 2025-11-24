import { ok, ResultAsync } from "neverthrow";
import fs from "node:fs/promises";
import path from "node:path";

import { QUEST_MANIFEST_FILE_NAME } from "../constants";
import { type AbsolutePath } from "../schemas/paths";
import { TypedError } from "./errors";
import { getIgnore } from "./get-ignore";

export function copyTemplate({
  targetDir,
  templateDir,
}: {
  targetDir: AbsolutePath;
  templateDir: AbsolutePath;
}) {
  return ResultAsync.fromPromise(
    getIgnore(templateDir),
    (error) =>
      new TypedError.FileSystem(
        `Failed to get ignore patterns for template copy: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      ),
  )
    .andThen((ignore) => {
      // When starting from a template, don't use its existing manifest
      ignore.add(QUEST_MANIFEST_FILE_NAME);
      // Ignore screenshots
      ignore.add("screenshot.*");
      return ok(ignore);
    })
    .andThen((ignore) =>
      ResultAsync.fromPromise(
        fs.cp(templateDir, targetDir, {
          filter: (src) => {
            const relativePath = path.relative(templateDir, src);
            // Empty is root
            return relativePath === "" || !ignore.ignores(relativePath);
          },
          recursive: true,
        }),
        (error) =>
          new TypedError.FileSystem(
            `Failed to copy template files: ${error instanceof Error ? error.message : String(error)}`,
            { cause: error },
          ),
      ).map(() => true),
    );
}
