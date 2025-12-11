import { ok, ResultAsync } from "neverthrow";
import fs from "node:fs/promises";
import path from "node:path";

import { APP_PRIVATE_FOLDER, QUEST_MANIFEST_FILE_NAME } from "../constants";
import { type AbsolutePath } from "../schemas/paths";
import { TypedError } from "./errors";
import { getIgnore } from "./get-ignore";

export function copyProject({
  includePrivateFolder,
  isTemplate,
  sourceDir,
  targetDir,
}: {
  includePrivateFolder: boolean;
  isTemplate: boolean;
  sourceDir: AbsolutePath;
  targetDir: AbsolutePath;
}) {
  return ResultAsync.fromPromise(
    getIgnore(sourceDir),
    (error) =>
      new TypedError.FileSystem(
        `Failed to get ignore patterns for project copy: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      ),
  )
    .andThen((ignore) => {
      if (isTemplate) {
        // New projects will generate their own title and icon
        ignore.add(QUEST_MANIFEST_FILE_NAME);
        // Screenshots can confuse the agent
        ignore.add("screenshot.*");
      }
      return ok(ignore);
    })
    .andThen((ignore) =>
      ResultAsync.fromPromise(
        fs.cp(sourceDir, targetDir, {
          filter: (src) => {
            const relativePath = path.relative(sourceDir, src);
            if (relativePath === "") {
              return true;
            }
            if (
              includePrivateFolder &&
              relativePath.startsWith(APP_PRIVATE_FOLDER)
            ) {
              return true;
            }
            return !ignore.ignores(relativePath);
          },
          recursive: true,
        }),
        (error) =>
          new TypedError.FileSystem(
            `Failed to copy project files: ${error instanceof Error ? error.message : String(error)}`,
            { cause: error },
          ),
      ).map(() => true),
    );
}
