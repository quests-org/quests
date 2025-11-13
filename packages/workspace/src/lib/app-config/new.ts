import { type ProjectMode } from "@quests/shared";
import { ulid } from "ulid";

import { PROJECT_CHAT_MODE_PREFIX } from "../../constants";
import {
  type ProjectSubdomain,
  ProjectSubdomainSchema,
} from "../../schemas/subdomains";
import { type WorkspaceConfig } from "../../types";
import { generateNewFolderName } from "../generate-folder-name";
import { createAppConfig, type CreateAppConfigReturn } from "./create";

export async function newProjectConfig({
  mode,
  workspaceConfig,
}: {
  mode: ProjectMode;
  workspaceConfig: WorkspaceConfig;
}): Promise<CreateAppConfigReturn<ProjectSubdomain>> {
  const rawSubdomain =
    mode === "chat"
      ? `${PROJECT_CHAT_MODE_PREFIX}-${ulid().toLowerCase()}`
      : await generateNewFolderName(workspaceConfig.projectsDir);
  return createAppConfig({
    subdomain: ProjectSubdomainSchema.parse(rawSubdomain),
    workspaceConfig,
  });
}
