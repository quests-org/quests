import { PROJECT_MANIFEST_FILE_NAME } from "@quests/shared";
import { APP_FOLDER_NAMES } from "@quests/workspace/client";

import { filenameFromFilePath } from "./path-utils";

const FILTERED_FILENAMES = [
  PROJECT_MANIFEST_FILE_NAME,
  "AGENTS.md",
  ".gitignore",
  "eslint.config.js",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "readme.md",
  "tsconfig.json",
  "vite.config.ts",
];

export function hasVisibleProjectFiles(
  rawFiles: { filePath: string }[],
): boolean {
  return rawFiles.some(
    (f) =>
      !isProjectFileSrcFile(f.filePath) &&
      !shouldFilterProjectFile(f.filePath) &&
      // TODO(skills): Remove this once skills are no longer in the project folder
      !f.filePath.startsWith("skills/"),
  );
}

export function isProjectFileSrcFile(filePath: string): boolean {
  return filePath.startsWith(`${APP_FOLDER_NAMES.src}/`);
}

export function shouldFilterProjectFile(filePath: string): boolean {
  const baseName = filenameFromFilePath(filePath).toLowerCase();
  return FILTERED_FILENAMES.some(
    (filtered) => baseName === filtered.toLowerCase(),
  );
}
