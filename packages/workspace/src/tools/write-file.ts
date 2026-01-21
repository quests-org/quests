// Adapted from
// https://github.com/sst/opencode/blob/dev/packages/opencode/src/tool/write.ts
import ms from "ms";
import { err, ok } from "neverthrow";
import { dedent, sift } from "radashi";
import { z } from "zod";

import { APP_FOLDER_NAMES } from "../constants";
import { absolutePathJoin } from "../lib/absolute-path-join";
import { ensureRelativePath } from "../lib/ensure-relative-path";
import { executeError } from "../lib/execute-error";
import { pathExists } from "../lib/path-exists";
import { PNPM_COMMAND } from "../lib/shell-commands/pnpm";
import { writeFileWithDir } from "../lib/write-file-with-dir";
import { RelativePathSchema } from "../schemas/paths";
import { BaseInputSchema } from "./base";
import { createTool } from "./create-tool";
import { ReadFile } from "./read-file";
import { diagnosticsReminder } from "./run-diagnostics";
import { RunShellCommand } from "./run-shell-command";

const INPUT_PARAMS = {
  content: "content",
  filePath: "filePath",
} as const;

function scriptsDirectoryReminder(filePath: string): string | undefined {
  // Scripts will often use new dependencies, so we remind the agent to add them.
  if (filePath.startsWith(`${APP_FOLDER_NAMES.scripts}/`)) {
    return dedent`
      Before running this script, add any new dependencies using the ${RunShellCommand.name} tool with the ${PNPM_COMMAND.name} command.
    `;
  }
  return undefined;
}

export const WriteFile = createTool({
  description: dedent`
    Writes a file to the local filesystem.

    Usage:
    - The ${INPUT_PARAMS.filePath} parameter must be a relative path. E.g. ./src/client/app.tsx
    - This tool will overwrite the existing file if there is one at the provided path.
    - If this is an existing file, you MUST use the ${ReadFile.name} tool first to read the file's contents. This tool will fail if you did not read the file first.
    - ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
    - NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
    - Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked.
  `,
  execute: async ({ appConfig, input, signal }) => {
    const fixedPathResult = ensureRelativePath(input.filePath);
    if (fixedPathResult.isErr()) {
      return err(fixedPathResult.error);
    }
    const fixedPath = fixedPathResult.value;

    const absolutePath = absolutePathJoin(appConfig.appDir, fixedPath);
    const isNewFile = !(await pathExists(absolutePath));

    try {
      await writeFileWithDir(absolutePath, input.content, { signal });

      return ok({
        content: input.content,
        filePath: fixedPath,
        isNewFile,
      });
    } catch (error) {
      return executeError(
        `Failed to write file ${fixedPath}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
  inputSchema: BaseInputSchema.extend({
    /* eslint-disable perfectionist/sort-objects */
    // Sorting the file path first to attempt to get model to generate it first
    [INPUT_PARAMS.filePath]: z.string().meta({
      description: "The path of the file to write. Generate this first.",
    }),
    [INPUT_PARAMS.content]: z
      .string()
      .meta({ description: "The content to write to the file" }),
    /* eslint-enable perfectionist/sort-objects */
  }),
  name: "write_file",
  outputSchema: z.object({
    content: z.string(),
    filePath: RelativePathSchema,
    isNewFile: z.boolean(),
  }),
  readOnly: false,
  timeoutMs: ms("15 seconds"),
  toModelOutput: ({ output }) => {
    const baseContent = output.isNewFile
      ? "Successfully wrote new file"
      : "Successfully overwrote existing file";

    return {
      type: "text",
      value: sift([
        `${baseContent} ${output.filePath}`,
        diagnosticsReminder(output.filePath),
        scriptsDirectoryReminder(output.filePath),
      ]).join("\n\n"),
    };
  },
});
