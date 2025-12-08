// Adapted from
// https://github.com/sst/opencode/blob/dev/packages/opencode/src/tool/read.ts
import mime from "mime";
import ms from "ms";
import { err, ok } from "neverthrow";
import fs from "node:fs/promises";
import path from "node:path";
import { dedent } from "radashi";
import { z } from "zod";

import { absolutePathJoin } from "../lib/absolute-path-join";
import { addLineNumbers } from "../lib/add-line-numbers";
import { fixRelativePath } from "../lib/fix-relative-path";
import { formatBytes } from "../lib/format-bytes";
import { isBinaryFile } from "../lib/is-binary-file";
import { pathExists } from "../lib/path-exists";
import { RelativePathSchema } from "../schemas/paths";
import { BaseInputSchema } from "./base";
import { createTool } from "./create-tool";

const DEFAULT_READ_LIMIT = 2000;
const MAX_LINE_LENGTH = 2000;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

const INPUT_PARAMS = {
  filePath: "filePath",
  limit: "limit",
  offset: "offset",
} as const;

export const ReadFile = createTool({
  description: dedent`
    Reads a file from the app directory. You can access any file directly by using this tool.

    Usage:
    - The ${INPUT_PARAMS.filePath} parameter must be a relative path. E.g. ./src/client/app.tsx
    - By default, it reads up to ${DEFAULT_READ_LIMIT} lines starting from the beginning of the file.
    - You can optionally specify a line ${INPUT_PARAMS.offset} and ${INPUT_PARAMS.limit} (especially handy for long files), but it's recommended to read the whole file by not providing these parameters.
    - When using ${INPUT_PARAMS.limit}, avoid using too small of a limit (< 100), which can lead to tons of tokens being used.
    - Any lines longer than ${MAX_LINE_LENGTH} characters will be truncated.
    - Results are returned using cat -n format, with line numbers starting at the ${INPUT_PARAMS.offset} or 1.
    - You have the capability to call multiple tools in a single response. It is always better to speculatively read multiple files as a batch that are potentially useful. 
    - If you read a file that exists but has empty contents you will receive a system reminder warning in place of file contents.
    - You can read images and PDFs by using this tool.
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

    const mimeType = mime.getType(absolutePath);
    const isImage = mimeType?.startsWith("image/");
    const isPdf = mimeType === "application/pdf";

    if (isImage) {
      const stats = await fs.stat(absolutePath);
      if (stats.size > MAX_IMAGE_SIZE_BYTES) {
        return err({
          message: [
            `Image file too large: ${fixedPath}`,
            `(${formatBytes(stats.size)}, max ${formatBytes(MAX_IMAGE_SIZE_BYTES)}).`,
            "Consider using command-line tools or scripts to reduce the image size before reading it.",
          ].join(" "),
          type: "execute-error",
        });
      }

      const imageData = await fs.readFile(absolutePath, { signal });
      const base64Data = imageData.toString("base64");

      return ok({
        base64Data,
        filePath: fixedPath,
        mimeType: mimeType ?? "application/octet-stream",
        state: "image" as const,
      });
    }

    if (isPdf) {
      const stats = await fs.stat(absolutePath);
      if (stats.size > MAX_PDF_SIZE_BYTES) {
        return err({
          message: [
            `PDF file too large: ${fixedPath}`,
            `(${formatBytes(stats.size)}, max ${formatBytes(MAX_PDF_SIZE_BYTES)}).`,
            "Consider extracting text from the PDF using command-line tools or scripts to process it locally.",
          ].join(" "),
          type: "execute-error",
        });
      }

      const pdfData = await fs.readFile(absolutePath, { signal });
      const base64Data = pdfData.toString("base64");

      return ok({
        base64Data,
        filePath: fixedPath,
        mimeType: "application/pdf",
        state: "pdf" as const,
      });
    }

    const isBinary = await isBinaryFile(absolutePath);
    if (isBinary) {
      return err({
        message: [
          `Cannot read binary file: ${fixedPath}.`,
          "Consider using command-line tools or scripts to extract or convert the file contents if needed.",
        ].join(" "),
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
        description: `The number of lines to read (defaults to ${DEFAULT_READ_LIMIT})`,
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
      base64Data: z.string(),
      filePath: RelativePathSchema,
      mimeType: z.string(),
      state: z.literal("image"),
    }),
    z.object({
      base64Data: z.string(),
      filePath: RelativePathSchema,
      mimeType: z.string(),
      state: z.literal("pdf"),
    }),
    z.object({
      filePath: RelativePathSchema,
      state: z.literal("does-not-exist"),
      suggestions: z.array(z.string()),
    }),
  ]),
  readOnly: true,
  timeoutMs: ms("5 seconds"),
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

    if (output.state === "image") {
      return {
        type: "content",
        value: [
          {
            text: `Image file: ${output.filePath}`,
            type: "text",
          },
          {
            data: output.base64Data,
            mediaType: output.mimeType,
            type: "media",
          },
        ],
      };
    }

    if (output.state === "pdf") {
      return {
        type: "content",
        value: [
          {
            text: `PDF file: ${output.filePath}`,
            type: "text",
          },
          {
            data: output.base64Data,
            mediaType: output.mimeType,
            type: "media",
          },
        ],
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
