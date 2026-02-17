import { glob } from "glob";
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
import { getIgnore } from "../lib/get-ignore";
import { pathExists } from "../lib/path-exists";
import { resolveAgentPath } from "../lib/resolve-agent-path";
import {
  type AbsolutePath,
  type RelativePath,
  RelativePathSchema,
} from "../schemas/paths";
import { BaseInputSchema } from "./base";
import { setupTool } from "./create-tool";

const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024; // 1GB

const INPUT_PARAMS = {
  path: "path",
  pattern: "pattern",
} as const;

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
  }),
}).create({
  description: dedent`
    Copy files matching a glob pattern from an attached folder into the project folder.
    You can use glob patterns to copy multiple files at once (e.g., "*.ts", "src/**/*.tsx") or specify a direct file path to copy a single file.
    Files are automatically renamed if a conflict exists.
    The parent agent can then access the copied files.
  `,
  execute: async ({ agentName, appConfig, input, projectState }) => {
    if (agentName !== "retrieval") {
      return executeError("This tool is only available to the retrieval agent");
    }

    if (!projectState.attachedFolders) {
      return executeError("No attached folders available");
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
    const ignore = await getIgnore(searchRoot);

    const matchedFiles = await glob(input.pattern, {
      absolute: true,
      cwd: searchRoot,
      ignore: {
        ignored: (p) => {
          return ignore.ignores(p.name);
        },
      },
      // cspell:ignore nodir
      nodir: true, // Only match files, not directories
      posix: true,
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

    for (const sourceAbsolutePath of matchedFiles) {
      const sourceExists = await pathExists(sourceAbsolutePath as AbsolutePath);
      if (!sourceExists) {
        errors.push({
          message: "File not found",
          sourcePath: sourceAbsolutePath,
        });
        continue;
      }

      const sourceStats = await fs.stat(sourceAbsolutePath);
      if (sourceStats.size > MAX_FILE_SIZE_BYTES) {
        errors.push({
          message: `File too large ${formatBytes(sourceStats.size)}, max ${formatBytes(MAX_FILE_SIZE_BYTES)}. User must upload manually.`,
          sourcePath: sourceAbsolutePath,
        });
        continue;
      }

      const originalFilename = path.basename(sourceAbsolutePath);
      const uniqueFilename = await getUniqueFilename(
        retrievedDir,
        originalFilename,
      );

      const destinationRelative = `./${APP_FOLDER_NAMES.agentRetrieved}/${uniqueFilename}`;
      const destinationAbsolute = absolutePathJoin(
        appConfig.appDir,
        destinationRelative,
      );

      await fs.copyFile(sourceAbsolutePath, destinationAbsolute);

      const stats = await fs.stat(destinationAbsolute);

      copiedFiles.push({
        destinationPath: RelativePathSchema.parse(destinationRelative),
        size: stats.size,
        sourcePath: sourceAbsolutePath,
      });
    }

    return ok({
      errors,
      files: alphabetical(copiedFiles, (f) => f.destinationPath),
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

    if (output.files.length === 1 && firstFile && output.errors.length === 0) {
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
      Copied ${output.files.length} files ${formatBytes(totalSize)} total. Parent agent can now access these files:
      ${fileList}
    `;

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
