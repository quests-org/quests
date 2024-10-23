import { DEFAULT_THEME_GRADIENT } from "@quests/shared/icons";
import { type LanguageModel } from "ai";
import { type z } from "zod";

import { type QuestManifest } from "../schemas/quest-manifest";
import { type SessionMessage } from "../schemas/session/message";
import { type ProjectSubdomainSchema } from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";
import { generateProjectIcon } from "./generate-project-icon";
import { generateProjectTitle } from "./generate-project-title";
import { updateQuestManifest } from "./quest-manifest";

export async function generateProjectTitleAndIcon({
  message,
  model,
  onUpdate,
  projectSubdomain,
  workspaceConfig,
}: {
  message: SessionMessage.UserWithParts;
  model: LanguageModel;
  onUpdate: () => void;
  projectSubdomain: z.output<typeof ProjectSubdomainSchema>;
  workspaceConfig: WorkspaceConfig;
}) {
  const [titleResult, iconResult] = await Promise.allSettled([
    generateProjectTitle({
      message,
      model,
    }),
    generateProjectIcon({
      message,
      model,
    }),
  ]);

  const updates: Partial<QuestManifest> = {};

  if (titleResult.status === "fulfilled" && titleResult.value.isOk()) {
    updates.name = titleResult.value.value;
  }

  if (iconResult.status === "fulfilled" && iconResult.value.isOk()) {
    updates.icon = {
      background: DEFAULT_THEME_GRADIENT,
      lucide: iconResult.value.value,
    };
  }

  if (Object.keys(updates).length > 0) {
    await updateQuestManifest(projectSubdomain, workspaceConfig, updates);
    onUpdate();
  }
}
