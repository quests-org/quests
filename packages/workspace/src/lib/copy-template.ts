import { ResultAsync } from "neverthrow";
import fs from "node:fs/promises";
import path from "node:path";

import { type AbsolutePath } from "../schemas/paths";
import { getIgnore } from "./get-ignore";

export function copyTemplate({
  targetDir,
  templateDir,
}: {
  targetDir: AbsolutePath;
  templateDir: AbsolutePath;
}) {
  return ResultAsync.fromPromise(getIgnore(templateDir), (error) => ({
    message: `Failed to get ignore patterns: ${error instanceof Error ? error.message : String(error)}`,
    type: "copy-template-error" as const,
  })).andThen((ignore) =>
    ResultAsync.fromPromise(
      fs.cp(templateDir, targetDir, {
        filter: (src) => {
          const relativePath = path.relative(templateDir, src);
          // Empty is root
          return relativePath === "" || !ignore.ignores(relativePath);
        },
        recursive: true,
      }),
      (error) => ({
        message: `Failed to copy template: ${error instanceof Error ? error.message : String(error)}`,
        type: "copy-template-error" as const,
      }),
    ).map(() => true),
  );
}
