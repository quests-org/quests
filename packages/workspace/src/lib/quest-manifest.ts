import fs from "node:fs/promises";

import { QUEST_MANIFEST_FILE_NAME } from "../constants";
import { type AppDir } from "../schemas/paths";
import {
  type QuestManifest,
  QuestManifestSchema,
} from "../schemas/quest-manifest";
import { absolutePathJoin } from "./absolute-path-join";

export async function getQuestManifest(
  appDir: AppDir,
): Promise<QuestManifest | undefined> {
  const questConfigPath = absolutePathJoin(appDir, QUEST_MANIFEST_FILE_NAME);

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
  appDir: AppDir,
  updates: Partial<QuestManifest>,
): Promise<void> {
  const questConfigPath = absolutePathJoin(appDir, QUEST_MANIFEST_FILE_NAME);

  let existingConfig: QuestManifest = { name: "" };

  try {
    existingConfig = (await getQuestManifest(appDir)) ?? { name: "" };
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
