import { PROJECT_MANIFEST_FILE_NAME } from "@quests/shared";
import fs from "node:fs/promises";

import { type AppDir } from "../schemas/paths";
import { absolutePathJoin } from "./absolute-path-join";
import { getAppPrivateDir } from "./app-dir-utils";
import { getCurrentDate } from "./get-current-date";
import { pathExists } from "./path-exists";

export async function getAppDirTimestamps(appDir: AppDir) {
  const privateDir = getAppPrivateDir(appDir);
  const projectConfigPath = absolutePathJoin(
    appDir,
    PROJECT_MANIFEST_FILE_NAME,
  );
  const srcFolder = absolutePathJoin(appDir, "src");
  const paths = [
    privateDir, // Changes when agent changes
    srcFolder, // Changes when code changes
    projectConfigPath, // Changes when app name/icon changes
  ];

  for (const path of paths) {
    try {
      if (await pathExists(path)) {
        const stats = await fs.stat(path);
        return {
          createdAt: stats.birthtime,
          updatedAt: stats.mtime,
        };
      }
    } catch {
      continue;
    }
  }

  const now = getCurrentDate();
  // If all paths are missing, sort to the top
  return {
    createdAt: now,
    updatedAt: now,
  };
}
