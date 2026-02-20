// Adapted from
// https://github.com/sst/opencode/blob/dev/packages/opencode/src/tool/read.ts
import { isBinaryFile } from "isbinaryfile";
import ms from "ms";
import { err, ok } from "neverthrow";
import fs from "node:fs/promises";
import { dedent } from "radashi";
import { z } from "zod";

import { addLineNumbers } from "../lib/add-line-numbers";
import { executeError } from "../lib/execute-error";
import { formatBytes } from "../lib/format-bytes";
import { getMimeType } from "../lib/get-mime-type";
import { pathExists } from "../lib/path-exists";
import {
  getSimilarPathSuggestions,
  resolveAgentPath,
} from "../lib/resolve-agent-path";
import { ripgrepFiles } from "../lib/ripgrep";
import { BaseInputSchema } from "./base";
import { setupTool } from "./create-tool";

const DEFAULT_READ_LIMIT = 2000;
const MAX_LINE_LENGTH = 2000;
const MAX_BYTES = 50 * 1024;

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

export const ReadFile = setupTool({
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
        description:
          "The line number to start reading from (1-based, defaults to 1)",
      }),
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
      // TODO: Remove `.optional()` after 2026-04-19 (backward compat)
      truncatedByBytes: z.boolean().optional().default(false),
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
}).create({
  description: (agentName) => {
    const pathExample =
      agentName === "retrieval"
        ? "/path/to/some/file.pdf"
        : "./src/client/app.tsx";

    return dedent`
      Reads a file from the ${agentName === "retrieval" ? "attached folders" : "app directory"}. You can access any file directly by using this tool.

      Usage:
      - The ${INPUT_PARAMS.filePath} parameter must be ${agentName === "retrieval" ? "an absolute path to a file within one of the attached folders" : "a relative path to a file"}. E.g. ${pathExample}
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
    const pathResult = resolveAgentPath({
      agentName,
      appDir: appConfig.appDir,
      attachedFolders: projectState.attachedFolders,
      inputPath: input.filePath,
      isRequired: true,
    });

    if (pathResult.isErr()) {
      return err(pathResult.error);
    }

    const { absolutePath, displayPath } = pathResult.value;
    const exists = await pathExists(absolutePath);

    if (!exists) {
      const suggestions = await getSimilarPathSuggestions({
        absolutePath,
        agentName,
        displayPath,
      });

      return ok({
        filePath: displayPath,
        state: "does-not-exist" as const,
        suggestions,
      });
    }

    const stats = await fs.stat(absolutePath);
    if (stats.isDirectory()) {
      const entries: string[] = [];
      for await (const file of ripgrepFiles({
        cwd: absolutePath,
        maxDepth: 1,
        signal,
      })) {
        entries.push(file);
      }
      entries.sort((a, b) => a.localeCompare(b));

      return ok({
        content: entries.join("\n"),
        displayedLines: entries.length,
        filePath: displayPath,
        hasMoreLines: false,
        offset: 0,
        state: "exists" as const,
        totalLines: entries.length,
        truncatedByBytes: false,
      });
    }

    const isBinary = await isBinaryFile(absolutePath);
    if (!isBinary) {
      const content = await fs.readFile(absolutePath, {
        encoding: "utf8",
        signal,
      });

      const normalized = content.replaceAll("\r\n", "\n");
      const lines = normalized.split("\n");

      let limit = input.limit ?? DEFAULT_READ_LIMIT;
      if (limit <= 0) {
        limit = DEFAULT_READ_LIMIT;
      }

      const offset = Math.max(1, input.offset ?? 1);
      const clampedOffset = Math.min(offset, Math.max(1, lines.length));

      let selectedLines = lines.slice(
        clampedOffset - 1,
        clampedOffset - 1 + limit,
      );
      let hasMoreLines =
        lines.length > clampedOffset - 1 + selectedLines.length;
      let truncatedByBytes = false;

      const processedLines = selectedLines.map((line) =>
        line.length > MAX_LINE_LENGTH
          ? line.slice(0, Math.max(0, MAX_LINE_LENGTH)) + "..."
          : line,
      );

      let rawContent = processedLines.join("\n");

      if (Buffer.byteLength(rawContent, "utf8") > MAX_BYTES) {
        let trimmed = [...processedLines];
        while (
          trimmed.length > 0 &&
          Buffer.byteLength(trimmed.join("\n"), "utf8") > MAX_BYTES
        ) {
          trimmed = trimmed.slice(0, -1);
        }
        selectedLines = trimmed;
        rawContent = trimmed.join("\n");
        hasMoreLines = true;
        truncatedByBytes = true;
      }

      return ok({
        content: rawContent,
        displayedLines: selectedLines.length,
        filePath: displayPath,
        hasMoreLines,
        offset: clampedOffset,
        state: "exists" as const,
        totalLines: lines.length,
        truncatedByBytes,
      });
    }

    const mimeType = getMimeType(absolutePath);

    if (mimeType.startsWith("image/") && mimeType !== "image/svg+xml") {
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
  readOnly: true,
  timeoutMs: ms("15 seconds"),
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

    const offset = output.offset;
    const endLine = offset + output.displayedLines - 1;
    const remainingLines = output.totalLines - endLine;

    const numberedContent = addLineNumbers(output.content, offset - 1);

    const isPartial = offset > 1 || output.hasMoreLines;
    const header = isPartial
      ? `lines ${offset}-${endLine} (total ${output.totalLines} lines)`
      : "entire file";

    const hiddenBefore = offset - 1;

    let contentBody = "";
    if (hiddenBefore > 0) {
      contentBody += `... ${hiddenBefore} lines not shown ...\n`;
    }
    contentBody += numberedContent;
    if (output.truncatedByBytes && remainingLines > 0) {
      contentBody += `\n... ${remainingLines} lines not shown (output capped at 50KB) ...\n\n(Use ${INPUT_PARAMS.offset} parameter to read beyond line ${endLine})`;
    } else if (output.hasMoreLines && remainingLines > 0) {
      contentBody += `\n... ${remainingLines} lines not shown ...\n\n(Use ${INPUT_PARAMS.offset} parameter to read beyond line ${endLine + 1})`;
    }

    const result = `<path>${output.filePath}</path>\n<content${isPartial ? ` lines="${header}"` : ""}>\n${contentBody}\n</content>`;

    return {
      type: "text",
      value: result,
    };
  },
});
