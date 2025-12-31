import { PROJECT_CONFIG_FILE_NAME } from "@quests/shared";
import fs from "node:fs/promises";

import { type AppDir } from "../schemas/paths";
import {
  type ProjectConfig,
  ProjectConfigSchema,
} from "../schemas/project-config";
import { absolutePathJoin } from "./absolute-path-join";

export async function getProjectConfig(
  appDir: AppDir,
): Promise<ProjectConfig | undefined> {
  const projectConfigPath = absolutePathJoin(appDir, PROJECT_CONFIG_FILE_NAME);

  try {
    const configContent = await fs.readFile(projectConfigPath, "utf8");
    const parsed = ProjectConfigSchema.safeParse(JSON.parse(configContent));
    if (!parsed.success) {
      return undefined;
    }
    return parsed.data;
  } catch {
    return undefined;
  }
}

export async function updateProjectConfig(
  appDir: AppDir,
  updates: Partial<ProjectConfig>,
): Promise<void> {
  const projectConfigPath = absolutePathJoin(appDir, PROJECT_CONFIG_FILE_NAME);

  let existingConfig: ProjectConfig = { name: "" };

  try {
    existingConfig = (await getProjectConfig(appDir)) ?? { name: "" };
  } catch {
    // File doesn't exist or is invalid, use default config
  }

  const updatedConfig: ProjectConfig = {
    ...existingConfig,
    ...updates,
    icon: updates.icon
      ? {
          ...existingConfig.icon,
          ...updates.icon,
        }
      : existingConfig.icon,
  };

  await fs.writeFile(projectConfigPath, JSON.stringify(updatedConfig, null, 2));
}
