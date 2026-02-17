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
  sourcePath: "sourcePath",
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

export const CopyToProject = createTool({
  description: dedent`
    Copy a file from an attached folder into the project folder.
    Files are automatically renamed if a conflict exists.
    The parent agent can then access the copied file.
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

    // Automatically place in agent-retrieved folder with deduplication
    const retrievedDir = absolutePathJoin(
      appConfig.appDir,
      APP_FOLDER_NAMES.agentRetrieved,
    );
    await fs.mkdir(retrievedDir, { recursive: true });

    const originalFilename = path.basename(sourcePath);
    const uniqueFilename = await getUniqueFilename(
      retrievedDir,
      originalFilename,
    );

    const destinationRelative = `./${APP_FOLDER_NAMES.agentRetrieved}/${uniqueFilename}`;
    const destinationAbsolute = absolutePathJoin(
      appConfig.appDir,
      destinationRelative,
    );

    await fs.copyFile(sourcePath, destinationAbsolute);

    const stats = await fs.stat(destinationAbsolute);

    return ok({
      destinationPath: RelativePathSchema.parse(destinationRelative),
      size: stats.size,
    });
  },
  inputSchema: BaseInputSchema.extend({
    [INPUT_PARAMS.sourcePath]: z.string().meta({
      description: "Absolute path to the source file within an attached folder",
    }),
  }),
  name: "copy_to_project",
  outputSchema: z.object({
    destinationPath: RelativePathSchema,
    size: z.number(),
  }),
  readOnly: false,
  timeoutMs: ms("1 minute"),
  toModelOutput: ({ output }) => {
    const sizeKB = (output.size / 1024).toFixed(2);
    return {
      type: "text",
      value: dedent`
        Copied to ${output.destinationPath} (${sizeKB} KB). Parent agent can now access this file.
      `,
    };
  },
});
