import fs from "node:fs/promises";
import path from "node:path";

import { type AppDir } from "../schemas/paths";
import { type WorkspaceConfig } from "../types";

export async function isPreviewExpired(
  previewDir: AppDir,
  cacheTimeMs: number,
): Promise<boolean> {
  const createdTime = await getPreviewCreatedTime(previewDir);
  if (!createdTime) {
    return false;
  }

  const now = Date.now();
  return now - createdTime > cacheTimeMs;
}

export async function removeExpiredPreview(
  previewDir: AppDir,
  workspaceConfig: WorkspaceConfig,
): Promise<void> {
  await workspaceConfig.trashItem(previewDir);
}

async function getPreviewCreatedTime(
  previewDir: AppDir,
): Promise<number | undefined> {
  try {
    const packageJsonPath = path.join(previewDir, "package.json");
    const stats = await fs.stat(packageJsonPath);
    return stats.mtime.getTime();
  } catch {
    return undefined;
  }
}
