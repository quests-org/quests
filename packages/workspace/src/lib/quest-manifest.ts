import fs from "node:fs/promises";
import path from "node:path";

import { QUEST_MANIFEST_FILE_NAME } from "../constants";
import { type AppDir } from "../schemas/paths";
import {
  type QuestManifest,
  QuestManifestSchema,
} from "../schemas/quest-manifest";
import { type ProjectSubdomain } from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";
import { createAppConfig } from "./app-config/create";

export async function getProjectQuestManifest(
  projectSubdomain: ProjectSubdomain,
  workspaceConfig: WorkspaceConfig,
): Promise<QuestManifest | undefined> {
  const appConfig = createAppConfig({
    subdomain: projectSubdomain,
    workspaceConfig,
  });

  return getQuestManifest(appConfig.appDir);
}

export async function getQuestManifest(
  appDir: AppDir,
): Promise<QuestManifest | undefined> {
  const questConfigPath = path.join(appDir, QUEST_MANIFEST_FILE_NAME);

  try {
    const configContent = await fs.readFile(questConfigPath, "utf8");
    const parsed = QuestManifestSchema.safeParse(JSON.parse(configContent));
    if (!parsed.success) {
      return undefined;
    }
    return parsed.data;
  } catch {
    return undefined;
  }
}

export async function updateQuestManifest(
  projectSubdomain: ProjectSubdomain,
  workspaceConfig: WorkspaceConfig,
  updates: Partial<QuestManifest>,
): Promise<void> {
  const appConfig = createAppConfig({
    subdomain: projectSubdomain,
    workspaceConfig,
  });

  const questConfigPath = path.join(appConfig.appDir, QUEST_MANIFEST_FILE_NAME);

  let existingConfig: QuestManifest = {
    icon: {
      background: "#525252",
      lucide: "box",
    },
    name: "",
  };

  try {
    const existing = await getQuestManifest(appConfig.appDir);
    if (existing) {
      existingConfig = existing;
    }
  } catch {
    // File doesn't exist or is invalid, use default config
  }

  const updatedConfig: QuestManifest = {
    ...existingConfig,
    ...updates,
    icon: updates.icon
      ? {
          ...existingConfig.icon,
          ...updates.icon,
        }
      : existingConfig.icon,
  };

  await fs.writeFile(questConfigPath, JSON.stringify(updatedConfig, null, 2));
}
