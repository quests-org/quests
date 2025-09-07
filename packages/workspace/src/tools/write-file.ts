// Adapted from
// https://github.com/sst/opencode/blob/dev/packages/opencode/src/tool/write.ts
import { err, ok } from "neverthrow";
import { dedent, sift } from "radashi";
import { z } from "zod";

import { absolutePathJoin } from "../lib/absolute-path-join";
import { fixRelativePath } from "../lib/fix-relative-path";
import { pathExists } from "../lib/path-exists";
import { writeFileWithDir } from "../lib/write-file-with-dir";
import { RelativePathSchema } from "../schemas/paths";
import { BaseInputSchema } from "./base";
import { createTool } from "./create-tool";
import { DIAGNOSTICS_HELPER_MESSAGE } from "./diagnostics-helper";
import { ReadFile } from "./read-file";

export const WriteFile = createTool({
  description: dedent`
    Writes a file to the local filesystem.

    Usage:
    - This tool will overwrite the existing file if there is one at the provided path.
    - If this is an existing file, you MUST use the ${ReadFile.name} tool first to read the file's contents. This tool will fail if you did not read the file first.
    - ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
    - NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
    - Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked.
  `,
  execute: async ({ appConfig, input, signal }) => {
    const fixedPath = fixRelativePath(input.filePath);
    if (!fixedPath) {
      return err({
        message: `Path is not relative: ${input.filePath}`,
        type: "execute-error",
      });
    }

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
      return err({
        message: `Failed to write file ${fixedPath}: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "execute-error",
      });
    }
  },
  inputSchema: BaseInputSchema.extend({
    content: z
      .string()
      .meta({ description: "The content to write to the file" }),
    filePath: z.string().meta({ description: "The path of the file to write" }),
  }),
  name: "write_file",
  outputSchema: z.object({
    content: z.string(),
    filePath: RelativePathSchema,
    isNewFile: z.boolean(),
  }),
  readOnly: false,
  timeoutMs: 15_000,
  toModelOutput: ({ output }) => {
    const baseContent = output.isNewFile
      ? "Successfully wrote new file"
      : "Successfully overwrote existing file";

    return {
      type: "text",
      value: sift([
        `${baseContent} ${output.filePath}`,
        DIAGNOSTICS_HELPER_MESSAGE,
      ]).join("\n\n"),
    };
  },
});
