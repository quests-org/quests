import { DEFAULT_THEME_GRADIENT, THEMES } from "@quests/shared/icons";
import { type LanguageModel } from "ai";
import { draw } from "radashi";

import { type ProjectConfig } from "../schemas/project-config";
import { type SessionMessage } from "../schemas/session/message";
import { type WorkspaceConfig } from "../types";
import { type AppConfigProject } from "./app-config/types";
import { generateProjectIcon } from "./generate-project-icon";
import { generateAppTitle } from "./generate-project-title";
import { getRegistryTemplateDetails } from "./get-registry-template-details";
import { updateProjectConfig } from "./project-config";

export async function generateProjectTitleAndIcon({
  message,
  model,
  onUpdate,
  projectConfig,
  templateName,
  workspaceConfig,
}: {
  message: SessionMessage.UserWithParts;
  model: LanguageModel;
  onUpdate: () => void;
  projectConfig: AppConfigProject;
  templateName: string;
  workspaceConfig: WorkspaceConfig;
}) {
  const templateDetails = await getRegistryTemplateDetails(
    templateName,
    workspaceConfig,
  );
  const templateTitle = templateDetails?.title;
  const [titleResult, iconResult] = await Promise.allSettled([
    generateAppTitle({
      message,
      model,
      templateTitle,
    }),
    generateProjectIcon({
      message,
      model,
      templateTitle,
    }),
  ]);

  const updates: Partial<ProjectConfig> = {};

  if (titleResult.status === "fulfilled" && titleResult.value.isOk()) {
    updates.name = titleResult.value.value;
  }

  if (iconResult.status === "fulfilled" && iconResult.value.isOk()) {
    const randomTheme = draw(THEMES) ?? DEFAULT_THEME_GRADIENT;
    updates.icon = {
      background: randomTheme,
      lucide: iconResult.value.value,
    };
  }

  if (Object.keys(updates).length > 0) {
    await updateProjectConfig(projectConfig.appDir, updates);
    onUpdate();
  }
}
