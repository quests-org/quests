import { type ProjectMode } from "@quests/shared";
import { ulid } from "ulid";

import { PROJECT_SUBDOMAIN_MODE_PREFIXES } from "../../constants";
import {
  type ProjectSubdomain,
  ProjectSubdomainSchema,
} from "../../schemas/subdomains";
import { type WorkspaceConfig } from "../../types";
import { generateNewFolderName } from "../generate-folder-name";
import { createAppConfig, type CreateAppConfigReturn } from "./create";

export async function newProjectConfig({
  evalName,
  mode,
  modelURI,
  workspaceConfig,
}: {
  evalName?: string;
  mode: ProjectMode;
  modelURI?: string;
  workspaceConfig: WorkspaceConfig;
}): Promise<CreateAppConfigReturn<ProjectSubdomain>> {
  let rawSubdomain: string;

  if (mode === "chat") {
    rawSubdomain = `${PROJECT_SUBDOMAIN_MODE_PREFIXES.chat}-${ulid().toLowerCase()}`;
  } else if (mode === "eval" && evalName && modelURI) {
    rawSubdomain = `${PROJECT_SUBDOMAIN_MODE_PREFIXES.eval}-${ulid().toLowerCase()}`;
  } else {
    rawSubdomain = await generateNewFolderName(workspaceConfig.projectsDir);
  }

  return createAppConfig({
    subdomain: ProjectSubdomainSchema.parse(rawSubdomain),
    workspaceConfig,
  });
}
