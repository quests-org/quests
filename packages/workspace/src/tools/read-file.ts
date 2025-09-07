// Adapted from
// https://github.com/sst/opencode/blob/dev/packages/opencode/src/tool/read.ts
import { err, ok } from "neverthrow";
import fs from "node:fs/promises";
import path from "node:path";
import { dedent } from "radashi";
import { z } from "zod";

import { absolutePathJoin } from "../lib/absolute-path-join";
import { addLineNumbers } from "../lib/add-line-numbers";
import { fixRelativePath } from "../lib/fix-relative-path";
import { pathExists } from "../lib/path-exists";
import { RelativePathSchema } from "../schemas/paths";
import { BaseInputSchema } from "./base";
import { createTool } from "./create-tool";

const MAX_READ_SIZE = 250 * 1024; // 250KB
const DEFAULT_READ_LIMIT = 2000;
const MAX_LINE_LIMIT = 5000;
const MAX_LINE_LENGTH = 2000;

function isImageFile(filePath: string): false | string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".bmp": {
      return "BMP";
    }
    case ".gif": {
      return "GIF";
    }
    case ".jpeg":
    case ".jpg": {
      return "JPEG";
    }
    case ".png": {
      return "PNG";
    }
    case ".svg": {
      return "SVG";
    }
    case ".webp": {
      return "WebP";
    }
    default: {
      return false;
    }
  }
}

const INPUT_PARAMS = {
  filePath: "filePath",
  limit: "limit",
  offset: "offset",
} as const;

export const ReadFile = createTool({
  description: dedent`
    Reads a file from the app directory. You can access any file directly by using this tool.

    Usage:
    - The ${INPUT_PARAMS.filePath} parameter must be an absolute path, not a relative path.
    - By default, it reads up to ${DEFAULT_READ_LIMIT} lines starting from the beginning of the file.
    - You can optionally specify a line ${INPUT_PARAMS.offset} and ${INPUT_PARAMS.limit} (especially handy for long files), but it's recommended to read the whole file by not providing these parameters.
    - When using ${INPUT_PARAMS.limit}, avoid using too small of a limit (< 100), which can lead to tons of tokens being used.
    - Any lines longer than ${MAX_LINE_LENGTH} characters will be truncated.
    - Results are returned using cat -n format, with line numbers starting at the ${INPUT_PARAMS.offset} or 1.
    - You have the capability to call multiple tools in a single response. It is always better to speculatively read multiple files as a batch that are potentially useful. 
    - If you read a file that exists but has empty contents you will receive a system reminder warning in place of file contents.
    - Images are not supported by this tool.
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
    const exists = await pathExists(absolutePath);

    if (!exists) {
      // Try to provide helpful suggestions
      try {
        const dir = path.dirname(absolutePath);
        const base = path.basename(absolutePath);
        const baseWithoutExt = path.parse(base).name;
        const dirEntries = await fs.readdir(dir);

        const suggestions = dirEntries
          .filter((entry) => {
            const entryWithoutExt = path.parse(entry).name;
            return (
              entry.toLowerCase().includes(base.toLowerCase()) ||
              base.toLowerCase().includes(entry.toLowerCase()) ||
              entryWithoutExt.toLowerCase() === baseWithoutExt.toLowerCase()
            );
          })
          .map((entry) => path.join(path.dirname(fixedPath), entry))
          .slice(0, 3);

        return ok({
          filePath: fixedPath,
          state: "does-not-exist" as const,
          suggestions,
        });
      } catch {
        // If we can't read the directory, just return basic error
        return ok({
          filePath: fixedPath,
          state: "does-not-exist" as const,
          suggestions: [],
        });
      }
    }

    // Check file size
    const stats = await fs.stat(absolutePath);
    if (stats.size > MAX_READ_SIZE) {
      return err({
        message: `File is too large (${stats.size} bytes). Maximum size is ${MAX_READ_SIZE} bytes`,
        type: "execute-error",
      });
    }

    // Check if it's an image file
    const imageType = isImageFile(absolutePath);
    if (imageType) {
      return err({
        message: `This is an image file of type: ${imageType}\nUse a different tool to process images`,
        type: "execute-error",
      });
    }

    const content = await fs.readFile(absolutePath, {
      encoding: "utf8",
      signal,
    });

    const lines = content.split("\n");

    let limit = input.limit ?? DEFAULT_READ_LIMIT;
    if (limit <= 0) {
      limit = DEFAULT_READ_LIMIT;
    }
    if (limit > MAX_LINE_LIMIT) {
      limit = MAX_LINE_LIMIT;
    }

    // Handle offset validation and defaults
    let offset = input.offset ?? 0;
    if (offset < 0) {
      offset = 0;
    }
    if (offset >= lines.length) {
      offset = Math.max(0, lines.length - 1);
    }

    const selectedLines = lines.slice(offset, offset + limit);

    // Truncate long lines but don't add line numbers here
    const processedLines = selectedLines.map((line) =>
      line.length > MAX_LINE_LENGTH
        ? line.slice(0, Math.max(0, MAX_LINE_LENGTH)) + "..."
        : line,
    );

    const rawContent = processedLines.join("\n");
    const hasMoreLines = lines.length > offset + selectedLines.length;

    return ok({
      content: rawContent,
      displayedLines: selectedLines.length,
      filePath: fixedPath,
      hasMoreLines,
      offset,
      state: "exists" as const,
      totalLines: lines.length,
    });
  },
  inputSchema: BaseInputSchema.extend({
    [INPUT_PARAMS.filePath]: z
      .string()
      .meta({ description: "Path to the file to read" }),
    [INPUT_PARAMS.limit]: z
      .number()
      .optional()
      .meta({
        description: `The number of lines to read (defaults to ${DEFAULT_READ_LIMIT}, max ${MAX_READ_SIZE})`,
      }),
    [INPUT_PARAMS.offset]: z
      .number()
      .optional()
      .meta({ description: "The line number to start reading from (0-based)" }),
  }),
  name: "read_file",
  outputSchema: z.discriminatedUnion("state", [
    z.object({
      content: z.string(),
      displayedLines: z.number(),
      filePath: RelativePathSchema,
      hasMoreLines: z.boolean(),
      offset: z.number(),
      state: z.literal("exists"),
      totalLines: z.number(),
    }),
    z.object({
      filePath: RelativePathSchema,
      state: z.literal("does-not-exist"),
      suggestions: z.array(z.string()),
    }),
  ]),
  readOnly: true,
  timeoutMs: 5000,
  toModelOutput: ({ output }) => {
    if (output.state === "does-not-exist") {
      const suggestionText =
        output.suggestions.length > 0
          ? `\n\nDid you mean one of these?\n${output.suggestions.join("\n")}`
          : "";

      return {
        type: "error-text",
        value: `File ${output.filePath} does not exist${suggestionText}`,
      };
    }

    const content = addLineNumbers(output.content, output.offset);
    const endLine = output.offset + output.displayedLines;
    const remainingLines = output.totalLines - endLine;

    const header = `Contents of ${output.filePath}${
      output.offset > 0 || output.hasMoreLines
        ? `, lines ${output.offset + 1}-${endLine} (total ${output.totalLines} lines)`
        : ` (entire file)`
    }`;

    let result = header + ":\n";

    if (output.offset > 0) {
      result += `... ${output.offset} lines not shown ...\n`;
    }

    result += content;

    if (output.hasMoreLines && remainingLines > 0) {
      result += `\n... ${remainingLines} lines not shown ...\n\n(Use ${INPUT_PARAMS.offset} parameter to read beyond line ${endLine})`;
    }

    return {
      type: "text",
      value: result,
    };
  },
});
