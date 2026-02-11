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

const INPUT_PARAMS = {
  destinationPath: "destinationPath",
  sourcePath: "sourcePath",
} as const;

interface CopyToProjectInput {
  destinationPath?: string;
  sourcePath: string;
}

export const CopyToProject = createTool({
  description: dedent`
    Copy a file from an attached folder into the project workspace.

    Usage:
    - The ${INPUT_PARAMS.sourcePath} parameter must be an absolute path to a file within an attached folder
    - The ${INPUT_PARAMS.destinationPath} parameter is optional. If not provided, the file will be copied to ./${APP_FOLDER_NAMES.input}/ with its original filename
    - The ${INPUT_PARAMS.destinationPath} must be a relative path within the project if provided (e.g., ./src/data/file.txt)
    - This tool is only available to the retrieval agent
    - After copying, the file becomes part of the project and can be modified by other tools
  `,
  execute: async ({ agentName, appConfig, input: rawInput, projectState }) => {
    const input = rawInput as CopyToProjectInput;

    // Only retrieval agent can use this tool
    if (agentName !== "retrieval") {
      return executeError(
        "CopyToProject tool is only available to the retrieval agent",
      );
    }

    if (!projectState.attachedFolders) {
      return executeError("No attached folders available");
    }

    // Validate source path is within attached folders
    const sourcePathResult = validateAttachedFolderPath(
      input.sourcePath,
      projectState.attachedFolders,
    );
    if (sourcePathResult.isErr()) {
      return err(sourcePathResult.error);
    }
    const sourcePath: AbsolutePath = sourcePathResult.value;

    // Check if source file exists
    const sourceExists = await pathExists(sourcePath);
    if (!sourceExists) {
      return executeError(`Source file does not exist: ${sourcePath}`);
    }

    // Determine destination path
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
      destinationRelative = `./${APP_FOLDER_NAMES.input}/${filename}`;
    }

    const destinationAbsolute = absolutePathJoin(
      appConfig.appDir,
      destinationRelative,
    );

    // Create destination directory if needed
    const destinationDir = path.dirname(destinationAbsolute);
    await fs.mkdir(destinationDir, { recursive: true });

    // Check if destination already exists
    const destExists = await pathExists(destinationAbsolute);
    if (destExists) {
      return executeError(
        `Destination file already exists: ${destinationRelative}. Please specify a different destination path.`,
      );
    }

    // Copy the file
    await fs.copyFile(sourcePath, destinationAbsolute);

    // Get file stats for metadata
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
        description: `Optional relative path within the project for the copied file. Defaults to ./${APP_FOLDER_NAMES.input}/ with original filename.`,
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
  timeoutMs: ms("10 seconds"),
  toModelOutput: ({ output }) => {
    const sizeKB = (output.size / 1024).toFixed(2);
    return {
      type: "text",
      value: dedent`
        Successfully copied file to project:
        - Source: ${output.sourcePath}
        - Destination: ${output.destinationPath}
        - Size: ${sizeKB} KB
        
        The file is now part of the project and can be read or modified using other tools.
      `,
    };
  },
});
