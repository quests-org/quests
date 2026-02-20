import ms from "ms";
import { ok } from "neverthrow";
import fs from "node:fs/promises";
import path from "node:path";
import { alphabetical, dedent } from "radashi";
import { z } from "zod";

import { APP_FOLDER_NAMES } from "../constants";
import { absolutePathJoin } from "../lib/absolute-path-join";
import { executeError } from "../lib/execute-error";
import { formatBytes } from "../lib/format-bytes";
import { glob, resolveGlobPattern } from "../lib/glob";
import { pathExists } from "../lib/path-exists";
import { resolveAgentPath } from "../lib/resolve-agent-path";
import { sanitizeFilename } from "../lib/sanitize-filename";
import {
  type AbsolutePath,
  type RelativePath,
  RelativePathSchema,
} from "../schemas/paths";
import { BaseInputSchema } from "./base";
import { setupTool } from "./create-tool";

const FILE_SIZE_LIMITS = {
  default: 1024 * 1024 * 50, // 50MB
  max: 1024 * 1024 * 1024, // 1GB
} as const;

const TOTAL_SIZE_LIMITS = {
  default: 1024 * 1024 * 1024, // 1GB
  max: 1024 * 1024 * 1024 * 10, // 10GB
} as const;

const FILE_COUNT_LIMITS = {
  default: 100,
  max: 1000,
} as const;

const INPUT_PARAMS = {
  maxFiles: "maxFiles",
  maxFileSizeBytes: "maxFileSizeBytes",
  maxTotalSizeBytes: "maxTotalSizeBytes",
  path: "path",
  pattern: "pattern",
} as const;

const TruncationReasonSchema = z.enum(["file_count_limit", "total_size_limit"]);

async function getUniqueFilename(
  retrievedDir: AbsolutePath,
  filename: string,
): Promise<string> {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);

  let candidate = filename;
  let counter = 1;

  while (true) {
    const filePath = absolutePathJoin(retrievedDir, candidate);
    const exists = await pathExists(filePath);
    if (!exists) {
      return candidate;
    }
    candidate = `${base}-${counter}${ext}`;
    counter++;
  }
}

export const CopyToProject = setupTool({
  inputSchema: BaseInputSchema.extend({
    [INPUT_PARAMS.maxFiles]: z
      .number()
      .optional()
      .meta({
        description: `Max files per call. Default: ${FILE_COUNT_LIMITS.default}, hard cap: ${FILE_COUNT_LIMITS.max}.`,
      }),
    [INPUT_PARAMS.maxFileSizeBytes]: z
      .number()
      .optional()
      .meta({
        description: `Max bytes per file. Default: ${formatBytes(FILE_SIZE_LIMITS.default)}, hard cap: ${formatBytes(FILE_SIZE_LIMITS.max)}.`,
      }),
    [INPUT_PARAMS.maxTotalSizeBytes]: z
      .number()
      .optional()
      .meta({
        description: `Max total bytes per call. Default: ${formatBytes(TOTAL_SIZE_LIMITS.default)}, hard cap: ${formatBytes(TOTAL_SIZE_LIMITS.max)}.`,
      }),
    [INPUT_PARAMS.path]: z.string().meta({
      description: "Absolute path to an attached folder to search within",
    }),
    [INPUT_PARAMS.pattern]: z
      .string()
      .meta({ description: "Glob pattern or direct file path to copy" }),
  }),
  name: "copy_to_project",
  outputSchema: z.object({
    errors: z.array(
      z.object({
        message: z.string(),
        sourcePath: z.string(),
      }),
    ),
    files: z.array(
      z.object({
        destinationPath: RelativePathSchema,
        size: z.number(),
        sourcePath: z.string(),
      }),
    ),
    truncatedCount: z.number(),
    truncationReason: TruncationReasonSchema.nullable(),
  }),
}).create({
  description: dedent`
    Copy files matching a glob pattern from an attached folder into the project folder.
    You can use glob patterns to copy multiple files at once (e.g., "*.ts", "src/**/*.tsx") or specify a direct file path to copy a single file.
    Files are automatically renamed if a conflict exists.
    If you must reference copied files when responding to the parent agent, use the destination paths returned by this tool, not the source paths.
    The parent agent can then access the copied files.
  `,
  execute: async ({ agentName, appConfig, input, projectState, signal }) => {
    if (agentName !== "retrieval") {
      return executeError("This tool is only available to the retrieval agent");
    }

    if (!projectState.attachedFolders) {
      return executeError("No attached folders available");
    }

    const maxFiles = input.maxFiles ?? FILE_COUNT_LIMITS.default;
    const maxFileSizeBytes = input.maxFileSizeBytes ?? FILE_SIZE_LIMITS.default;
    const maxTotalSizeBytes =
      input.maxTotalSizeBytes ?? TOTAL_SIZE_LIMITS.default;

    if (maxFiles > FILE_COUNT_LIMITS.max) {
      return executeError(
        `maxFiles (${maxFiles}) exceeds the hard cap of ${FILE_COUNT_LIMITS.max} files per call.`,
      );
    }

    if (maxFileSizeBytes > FILE_SIZE_LIMITS.max) {
      return executeError(
        `maxFileSizeBytes (${formatBytes(maxFileSizeBytes)}) exceeds the hard cap of ${formatBytes(FILE_SIZE_LIMITS.max)} per file.`,
      );
    }

    if (maxTotalSizeBytes > TOTAL_SIZE_LIMITS.max) {
      return executeError(
        `maxTotalSizeBytes (${formatBytes(maxTotalSizeBytes)}) exceeds the hard cap of ${formatBytes(TOTAL_SIZE_LIMITS.max)} per call.`,
      );
    }

    const pathResult = resolveAgentPath({
      agentName,
      appDir: appConfig.appDir,
      attachedFolders: projectState.attachedFolders,
      inputPath: input.path,
      isRequired: true,
    });

    if (pathResult.isErr()) {
      return executeError(pathResult.error.message);
    }

    const { absolutePath: searchRoot } = pathResult.value;

    const matchedFiles = await glob({
      absolute: true,
      cwd: searchRoot,
      pattern: resolveGlobPattern({ cwd: searchRoot, pattern: input.pattern }),
      signal,
    });

    if (matchedFiles.length === 0) {
      return executeError(
        `No files found matching pattern "${input.pattern}" in ${searchRoot}`,
      );
    }

    const retrievedDir = absolutePathJoin(
      appConfig.appDir,
      APP_FOLDER_NAMES.agentRetrieved,
    );
    await fs.mkdir(retrievedDir, { recursive: true });

    const copiedFiles: {
      destinationPath: RelativePath;
      size: number;
      sourcePath: string;
    }[] = [];

    const errors: {
      message: string;
      sourcePath: string;
    }[] = [];

    let totalBytesCopied = 0;
    let truncatedCount = 0;
    let truncationReason: null | z.output<typeof TruncationReasonSchema> = null;

    for (const sourceAbsolutePath of matchedFiles) {
      signal.throwIfAborted();
      const sourceExists = await pathExists(sourceAbsolutePath);
      if (!sourceExists) {
        errors.push({
          message: "File not found",
          sourcePath: sourceAbsolutePath,
        });
        continue;
      }

      const sourceStats = await fs.stat(sourceAbsolutePath);
      if (sourceStats.size > maxFileSizeBytes) {
        errors.push({
          message: `File too large (${formatBytes(sourceStats.size)}), max per-file size is ${formatBytes(maxFileSizeBytes)}. User must upload manually.`,
          sourcePath: sourceAbsolutePath,
        });
        continue;
      }

      if (copiedFiles.length >= maxFiles) {
        truncationReason = "file_count_limit";
        truncatedCount++;
        continue;
      }

      if (totalBytesCopied + sourceStats.size > maxTotalSizeBytes) {
        truncationReason = "total_size_limit";
        truncatedCount++;
        continue;
      }

      const originalFilename = path.basename(sourceAbsolutePath);
      const sanitizedFilename = sanitizeFilename(originalFilename);
      const uniqueFilename = await getUniqueFilename(
        retrievedDir,
        sanitizedFilename,
      );

      const destinationRelative = `./${APP_FOLDER_NAMES.agentRetrieved}/${uniqueFilename}`;
      const destinationAbsolute = absolutePathJoin(
        appConfig.appDir,
        destinationRelative,
      );

      await fs.copyFile(sourceAbsolutePath, destinationAbsolute);

      const stats = await fs.stat(destinationAbsolute);
      totalBytesCopied += stats.size;

      copiedFiles.push({
        destinationPath: RelativePathSchema.parse(destinationRelative),
        size: stats.size,
        sourcePath: sourceAbsolutePath,
      });
    }

    return ok({
      errors,
      files: alphabetical(copiedFiles, (f) => f.destinationPath),
      truncatedCount,
      truncationReason,
    });
  },
  readOnly: false,
  timeoutMs: ms("1 minute"),
  toModelOutput: ({ output }) => {
    if (output.files.length === 0 && output.errors.length === 0) {
      return {
        type: "error-text",
        value: "No files were copied",
      };
    }

    if (output.files.length === 0 && output.errors.length > 0) {
      const errorList = output.errors
        .map((e) => `  - ${e.sourcePath}: ${e.message}`)
        .join("\n");
      return {
        type: "error-text",
        value: dedent`
          Failed to copy any files:
          ${errorList}
        `,
      };
    }

    const [firstFile] = output.files;

    if (
      output.files.length === 1 &&
      firstFile &&
      output.errors.length === 0 &&
      output.truncationReason === null
    ) {
      return {
        type: "text",
        value: dedent`
          Copied to ${firstFile.destinationPath} ${formatBytes(firstFile.size)}. Parent agent can now access this file.
        `,
      };
    }

    const totalSize = output.files.reduce((sum, f) => sum + f.size, 0);
    const fileList = output.files
      .map((f) => `  - ${f.destinationPath} ${formatBytes(f.size)}`)
      .join("\n");

    let message = dedent`
      Copied ${output.files.length} files (${formatBytes(totalSize)} total). Parent agent can now access these files:
      ${fileList}
    `;

    if (output.truncationReason !== null) {
      const reasonMessage =
        output.truncationReason === "file_count_limit"
          ? `file count limit reached (${INPUT_PARAMS.maxFiles})`
          : `total size limit reached (${INPUT_PARAMS.maxTotalSizeBytes})`;
      message += `\n\nTruncated ${reasonMessage}: ${output.truncatedCount} file(s) not copied. Use a more specific pattern or increase the limit to copy the remaining files.`;
    }

    if (output.errors.length > 0) {
      const errorList = output.errors
        .map((e) => `  - ${e.sourcePath}: ${e.message}`)
        .join("\n");
      message += dedent`

        Failed to copy ${output.errors.length} files:
        ${errorList}
      `;
    }

    return {
      type: "text",
      value: message,
    };
  },
});
