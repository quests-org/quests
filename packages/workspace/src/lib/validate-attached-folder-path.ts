import { ok } from "neverthrow";
import path from "node:path";

import { type FolderAttachment } from "../schemas/folder-attachment";
import { AbsolutePathSchema } from "../schemas/paths";
import { executeError } from "./execute-error";

export function validateAttachedFolderPath(
  inputPath: string,
  attachedFolders: Record<string, FolderAttachment.Type>,
) {
  if (!path.isAbsolute(inputPath)) {
    return executeError(`Path must be absolute: ${inputPath}`);
  }

  const absolutePath = AbsolutePathSchema.parse(inputPath);

  const allowedFolders = Object.values(attachedFolders);
  const matchingFolder = allowedFolders.find((folder) =>
    inputPath.startsWith(folder.path),
  );

  if (!matchingFolder) {
    const folderList = allowedFolders
      .map((f) => `  - ${f.name}: ${f.path}`)
      .join("\n");

    return executeError(
      [
        `Path is not within any attached folder: ${inputPath}`,
        `\nAttached folders:\n${folderList}`,
      ].join(""),
    );
  }

  return ok(absolutePath);
}
