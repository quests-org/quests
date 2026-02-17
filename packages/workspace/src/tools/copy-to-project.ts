import ms from "ms";
import { err, ok } from "neverthrow";
import fs from "node:fs/promises";
import path from "node:path";
import { dedent } from "radashi";
import { z } from "zod";

import { APP_FOLDER_NAMES } from "../constants";
import { absolutePathJoin } from "../lib/absolute-path-join";
import { executeError } from "../lib/execute-error";
import { pathExists } from "../lib/path-exists";
import { validateAttachedFolderPath } from "../lib/validate-attached-folder-path";
import { type AbsolutePath, RelativePathSchema } from "../schemas/paths";
import { BaseInputSchema } from "./base";
import { createTool } from "./create-tool";

const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024; // 1GB

const INPUT_PARAMS = {
  destinationPath: "destinationPath",
  sourcePath: "sourcePath",
} as const;

export const CopyToProject = createTool({
  description: dedent`
    Copy a file from an attached folder into the project folder.

    Usage:
    - The ${INPUT_PARAMS.sourcePath} parameter must be an absolute path to a file within an attached folder
    - After copying, the file becomes part of the project and the main agent can access it
  `,
  execute: async ({ agentName, appConfig, input, projectState }) => {
    if (agentName !== "retrieval") {
      return executeError("This tool is only available to the retrieval agent");
    }

    if (!projectState.attachedFolders) {
      return executeError("No attached folders available");
    }

    const sourcePathResult = validateAttachedFolderPath(
      input.sourcePath,
      projectState.attachedFolders,
    );
    if (sourcePathResult.isErr()) {
      return err(sourcePathResult.error);
    }
    const sourcePath: AbsolutePath = sourcePathResult.value;

    const sourceExists = await pathExists(sourcePath);
    if (!sourceExists) {
      return executeError(`Source file does not exist: ${sourcePath}`);
    }

    const sourceStats = await fs.stat(sourcePath);
    if (sourceStats.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (sourceStats.size / 1024 / 1024).toFixed(2);
      const maxSizeMB = (MAX_FILE_SIZE_BYTES / 1024 / 1024).toFixed(0);
      return executeError(
        `File is too large to copy (${sizeMB} MB). Maximum size is ${maxSizeMB} MB. The user must upload this file manually if needed.`,
      );
    }

    let destinationRelative: string;
    if (input.destinationPath) {
      // User provided destination - validate it's relative
      if (path.isAbsolute(input.destinationPath)) {
        return executeError(
          `Destination path must be relative: ${input.destinationPath}`,
        );
      }
      destinationRelative = input.destinationPath;
    } else {
      // Default to input folder with original filename
      const filename = path.basename(sourcePath);
      destinationRelative = `./${APP_FOLDER_NAMES.agentRetrieved}/${filename}`;
    }

    const destinationAbsolute = absolutePathJoin(
      appConfig.appDir,
      destinationRelative,
    );

    const destinationDir = path.dirname(destinationAbsolute);
    await fs.mkdir(destinationDir, { recursive: true });

    // Check if destination already exists
    const destExists = await pathExists(destinationAbsolute);
    if (destExists) {
      return executeError(
        `Destination file already exists: ${destinationRelative}. Please specify a different destination path.`,
      );
    }

    await fs.copyFile(sourcePath, destinationAbsolute);

    const stats = await fs.stat(destinationAbsolute);

    return ok({
      destinationPath: RelativePathSchema.parse(destinationRelative),
      size: stats.size,
      sourcePath,
    });
  },
  inputSchema: BaseInputSchema.extend({
    [INPUT_PARAMS.destinationPath]: z
      .string()
      .optional()
      .meta({
        description: `Optional relative path within the project for the copied file. Defaults to ./${APP_FOLDER_NAMES.agentRetrieved}/ with original filename.`,
      }),
    [INPUT_PARAMS.sourcePath]: z.string().meta({
      description: "Absolute path to the source file within an attached folder",
    }),
  }),
  name: "copy_to_project",
  outputSchema: z.object({
    destinationPath: RelativePathSchema,
    size: z.number(),
    sourcePath: z.string(),
  }),
  readOnly: false,
  timeoutMs: ms("1 minute"),
  toModelOutput: ({ output }) => {
    const sizeKB = (output.size / 1024).toFixed(2);
    return {
      type: "text",
      value: dedent`
        Successfully copied file to project:
        - Source: ${output.sourcePath}
        - Destination: ${output.destinationPath}
        - Size: ${sizeKB} KB
        
        The file is now part of the project and the main agent can read or modify it using other tools.
      `,
    };
  },
});
