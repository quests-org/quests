// Adapted from
// https://github.com/sst/opencode/blob/dev/packages/opencode/src/tool/read.ts
import { isBinaryFile } from "isbinaryfile";
import ms from "ms";
import { err, ok } from "neverthrow";
import fs from "node:fs/promises";
import path from "node:path";
import { dedent } from "radashi";
import { z } from "zod";

import { absolutePathJoin } from "../lib/absolute-path-join";
import { addLineNumbers } from "../lib/add-line-numbers";
import { ensureRelativePath } from "../lib/ensure-relative-path";
import { executeError } from "../lib/execute-error";
import { formatBytes } from "../lib/format-bytes";
import { getMimeType } from "../lib/get-mime-type";
import { normalizePath } from "../lib/normalize-path";
import { pathExists } from "../lib/path-exists";
import { validateAttachedFolderPath } from "../lib/validate-attached-folder-path";
import { type AbsolutePath } from "../schemas/paths";
import { BaseInputSchema } from "./base";
import { createTool } from "./create-tool";
import { RunShellCommand } from "./run-shell-command";

const DEFAULT_READ_LIMIT = 2000;
const MAX_LINE_LENGTH = 2000;

const INPUT_PARAMS = {
  filePath: "filePath",
  limit: "limit",
  offset: "offset",
} as const;

type MediaFileState = "audio" | "image" | "pdf" | "video";

const MEDIA_CONFIG: Record<MediaFileState, { label: string; maxSize: number }> =
  {
    audio: {
      label: "Audio",
      maxSize: 10 * 1024 * 1024,
    },
    image: {
      label: "Image",
      maxSize: 10 * 1024 * 1024,
    },
    pdf: {
      label: "PDF",
      maxSize: 10 * 1024 * 1024,
    },
    video: {
      label: "Video",
      maxSize: 10 * 1024 * 1024,
    },
  };

// Some models support more formats, but this should be safe across most.
const SUPPORTED_IMAGE_FORMATS = ["image/jpeg", "image/png", "image/webp"];

async function handleMediaFile({
  absolutePath,
  fixedPath,
  mimeType,
  signal,
  state,
}: {
  absolutePath: string;
  fixedPath: string;
  mimeType: string;
  signal: AbortSignal;
  state: MediaFileState;
}) {
  const config = MEDIA_CONFIG[state];

  if (state === "image" && !SUPPORTED_IMAGE_FORMATS.includes(mimeType)) {
    return ok({
      filePath: fixedPath,
      mimeType,
      reason: "unsupported-image-format" as const,
      state: "unsupported-format" as const,
    });
  }

  const stats = await fs.stat(absolutePath);
  if (stats.size > config.maxSize) {
    return executeError(
      [
        `${config.label} file too large: ${fixedPath}`,
        `(${formatBytes(stats.size)}, max ${formatBytes(config.maxSize)}).`,
        "You can use command-line tools or scripts to compress or convert the file to reduce its size.",
      ].join(" "),
    );
  }

  const fileData = await fs.readFile(absolutePath, { signal });
  const base64Data = fileData.toString("base64");

  return ok({
    base64Data,
    filePath: fixedPath,
    mimeType,
    state,
  });
}

// Must define input schema at the top to allow for inference of functions below
/* eslint-disable perfectionist/sort-objects */
export const ReadFile = createTool({
  inputSchema: (agentName) => {
    const pathDescription =
      agentName === "retrieval"
        ? "Absolute path to the file to read (must be within an attached folder)"
        : "Relative path to the file to read";

    return BaseInputSchema.extend({
      [INPUT_PARAMS.filePath]: z
        .string()
        .meta({ description: pathDescription }),
      [INPUT_PARAMS.limit]: z
        .number()
        .optional()
        .meta({
          description: `The number of lines to read (defaults to ${DEFAULT_READ_LIMIT})`,
        }),
      [INPUT_PARAMS.offset]: z.number().optional().meta({
        description: "The line number to start reading from (0-based)",
      }),
    });
  },

  description: (agentName) => {
    const pathExample =
      agentName === "retrieval"
        ? "/Users/john/Documents/research/paper.pdf"
        : "./src/client/app.tsx";

    return dedent`
      Reads a file from the ${agentName === "retrieval" ? "attached folders" : "app directory"}. You can access any file directly by using this tool.

      Usage:
      - The ${INPUT_PARAMS.filePath} parameter must be ${agentName === "retrieval" ? "an absolute path to a file within one of the attached folders" : "a relative path to a file"}. E.g. ${pathExample}
      - This tool does NOT support reading directories. To list directory contents, use the ${RunShellCommand.name} tool with the 'ls' command instead.
      - By default, it reads up to ${DEFAULT_READ_LIMIT} lines starting from the beginning of the file.
      - You can optionally specify a line ${INPUT_PARAMS.offset} and ${INPUT_PARAMS.limit} (especially handy for long files), but it's recommended to read the whole file by not providing these parameters.
      - When using ${INPUT_PARAMS.limit}, avoid using too small of a limit (< 100), which can lead to tons of tokens being used.
      - Any lines longer than ${MAX_LINE_LENGTH} characters will be truncated.
      - Results are returned using cat -n format, with line numbers starting at the ${INPUT_PARAMS.offset} or 1.
      - You have the capability to call multiple tools in a single response. It is always better to speculatively read multiple files as a batch that are potentially useful. 
      - If you read a file that exists but has empty contents you will receive a system reminder warning in place of file contents.
      - You can read images, PDFs, audio files, and video files by using this tool.
    `;
  },
  execute: async ({ agentName, appConfig, input, projectState, signal }) => {
    let absolutePath: AbsolutePath;
    let displayPath: string;

    if (agentName === "retrieval" && projectState.attachedFolders) {
      // Retrieval agent: validate absolute path is within attached folders
      const pathResult = validateAttachedFolderPath(
        input.filePath,
        projectState.attachedFolders,
      );
      if (pathResult.isErr()) {
        return err(pathResult.error);
      }
      absolutePath = pathResult.value;
      displayPath = input.filePath;
    } else {
      // Normal agent: use relative path resolution
      const fixedPathResult = ensureRelativePath(input.filePath);
      if (fixedPathResult.isErr()) {
        return err(fixedPathResult.error);
      }
      const fixedPath = fixedPathResult.value;
      absolutePath = absolutePathJoin(appConfig.appDir, fixedPath);
      displayPath = fixedPath;
    }

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
          .map((entry) => {
            if (agentName === "retrieval") {
              // For retrieval agent, return absolute paths
              return path.join(dir, entry);
            }
            // For normal agent, return relative paths
            return normalizePath(path.join(path.dirname(displayPath), entry));
          })
          .slice(0, 3);

        return ok({
          filePath: displayPath,
          state: "does-not-exist" as const,
          suggestions,
        });
      } catch {
        // If we can't read the directory, just return basic error
        return ok({
          filePath: displayPath,
          state: "does-not-exist" as const,
          suggestions: [],
        });
      }
    }

    const isBinary = await isBinaryFile(absolutePath);
    if (!isBinary) {
      const content = await fs.readFile(absolutePath, {
        encoding: "utf8",
        signal,
      });

      const lines = content.split("\n");

      let limit = input.limit ?? DEFAULT_READ_LIMIT;
      if (limit <= 0) {
        limit = DEFAULT_READ_LIMIT;
      }

      let offset = input.offset ?? 0;
      if (offset < 0) {
        offset = 0;
      }
      if (offset >= lines.length) {
        offset = Math.max(0, lines.length - 1);
      }

      const selectedLines = lines.slice(offset, offset + limit);

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
        filePath: displayPath,
        hasMoreLines,
        offset,
        state: "exists" as const,
        totalLines: lines.length,
      });
    }

    const mimeType = getMimeType(absolutePath);

    if (mimeType.startsWith("image/")) {
      return handleMediaFile({
        absolutePath,
        fixedPath: displayPath,
        mimeType,
        signal,
        state: "image",
      });
    }

    if (mimeType === "application/pdf") {
      return handleMediaFile({
        absolutePath,
        fixedPath: displayPath,
        mimeType,
        signal,
        state: "pdf",
      });
    }

    if (mimeType.startsWith("audio/")) {
      return handleMediaFile({
        absolutePath,
        fixedPath: displayPath,
        mimeType,
        signal,
        state: "audio",
      });
    }

    if (mimeType.startsWith("video/")) {
      return handleMediaFile({
        absolutePath,
        fixedPath: displayPath,
        mimeType,
        signal,
        state: "video",
      });
    }

    return ok({
      filePath: displayPath,
      mimeType,
      reason: "binary-file" as const,
      state: "unsupported-format" as const,
    });
  },
  name: "read_file",
  outputSchema: z.discriminatedUnion("state", [
    z.object({
      content: z.string(),
      displayedLines: z.number(),
      filePath: z.string(),
      hasMoreLines: z.boolean(),
      offset: z.number(),
      state: z.literal("exists"),
      totalLines: z.number(),
    }),
    z.object({
      base64Data: z.string(),
      filePath: z.string(),
      mimeType: z.string(),
      state: z.literal("image"),
    }),
    z.object({
      base64Data: z.string(),
      filePath: z.string(),
      mimeType: z.string(),
      state: z.literal("pdf"),
    }),
    z.object({
      base64Data: z.string(),
      filePath: z.string(),
      mimeType: z.string(),
      state: z.literal("audio"),
    }),
    z.object({
      base64Data: z.string(),
      filePath: z.string(),
      mimeType: z.string(),
      state: z.literal("video"),
    }),
    z.object({
      filePath: z.string(),
      state: z.literal("does-not-exist"),
      suggestions: z.array(z.string()),
    }),
    z.object({
      filePath: z.string(),
      mimeType: z.string().optional(),
      reason: z.enum(["binary-file", "unsupported-image-format"]),
      state: z.literal("unsupported-format"),
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

    if (output.state === "unsupported-format") {
      if (output.reason === "unsupported-image-format") {
        const supportedFormatsText = SUPPORTED_IMAGE_FORMATS.map(
          (format) => `'${format}'`,
        ).join(", ");
        const mimeInfo = output.mimeType ? ` (${output.mimeType})` : "";
        return {
          type: "error-text",
          value: [
            `Unsupported image format: ${output.filePath}${mimeInfo}.`,
            `Input should be ${supportedFormatsText}.`,
            "Please convert the image to a supported format before reading.",
          ].join(" "),
        };
      }

      const mimeTypeInfo = output.mimeType
        ? ` (${output.mimeType})`
        : " with unknown MIME type";
      return {
        type: "error-text",
        value: [
          `Cannot read binary file${mimeTypeInfo}: ${output.filePath}.`,
          "Consider using command-line tools or scripts to extract or convert the file contents if needed.",
        ].join(" "),
      };
    }

    switch (output.state) {
      case "audio":
      case "image":
      case "pdf":
      case "video": {
        const config = MEDIA_CONFIG[output.state];

        return {
          type: "content",
          value: [
            {
              text: `${config.label} file: ${output.filePath}.`,
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

/* eslint-enable perfectionist/sort-objects */
