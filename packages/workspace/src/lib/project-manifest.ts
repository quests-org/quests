import { PROJECT_MANIFEST_FILE_NAME } from "@quests/shared";
import fs from "node:fs/promises";

import { type AppDir } from "../schemas/paths";
import {
  type ProjectManifest,
  ProjectManifestSchema,
} from "../schemas/project-manifest";
import { absolutePathJoin } from "./absolute-path-join";

export async function getProjectManifest(
  appDir: AppDir,
): Promise<ProjectManifest | undefined> {
  const projectManifestPath = absolutePathJoin(
    appDir,
    PROJECT_MANIFEST_FILE_NAME,
  );

  try {
    const manifestContent = await fs.readFile(projectManifestPath, "utf8");
    const parsed = ProjectManifestSchema.safeParse(JSON.parse(manifestContent));
    if (!parsed.success) {
      return undefined;
    }
    return parsed.data;
  } catch {
    return undefined;
  }
}

export async function updateProjectManifest(
  appDir: AppDir,
  updates: Partial<ProjectManifest>,
): Promise<void> {
  const projectManifestPath = absolutePathJoin(
    appDir,
    PROJECT_MANIFEST_FILE_NAME,
  );

  let existing: ProjectManifest = { name: "" };

  try {
    existing = (await getProjectManifest(appDir)) ?? { name: "" };
  } catch {
    // File doesn't exist or is invalid, use default manifest
  }

  const updated: ProjectManifest = {
    ...existing,
    ...updates,
    icon: updates.icon
      ? {
          ...existing.icon,
          ...updates.icon,
        }
      : existing.icon,
  };

  await fs.writeFile(projectManifestPath, JSON.stringify(updated, null, 2));
}
