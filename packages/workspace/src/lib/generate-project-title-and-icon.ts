import { DEFAULT_THEME_GRADIENT, THEMES } from "@quests/shared/icons";
import { type LanguageModel } from "ai";
import { draw } from "radashi";
import { type z } from "zod";

import { type QuestManifest } from "../schemas/quest-manifest";
import { type SessionMessage } from "../schemas/session/message";
import { type ProjectSubdomainSchema } from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";
import { generateProjectIcon } from "./generate-project-icon";
import { generateProjectTitle } from "./generate-project-title";
import { getRegistryTemplateDetails } from "./get-registry-template-details";
import { updateQuestManifest } from "./quest-manifest";

export async function generateProjectTitleAndIcon({
  message,
  model,
  onUpdate,
  projectSubdomain,
  templateName,
  workspaceConfig,
}: {
  message: SessionMessage.UserWithParts;
  model: LanguageModel;
  onUpdate: () => void;
  projectSubdomain: z.output<typeof ProjectSubdomainSchema>;
  templateName: string;
  workspaceConfig: WorkspaceConfig;
}) {
  const templateDetails = await getRegistryTemplateDetails(
    templateName,
    workspaceConfig,
  );
  const templateTitle = templateDetails?.title;
  const [titleResult, iconResult] = await Promise.allSettled([
    generateProjectTitle({
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

  const updates: Partial<QuestManifest> = {};

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
    await updateQuestManifest(projectSubdomain, workspaceConfig, updates);
    onUpdate();
  }
}
