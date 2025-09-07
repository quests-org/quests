import {
  type ProjectSubdomain,
  ProjectSubdomainSchema,
} from "../../schemas/subdomains";
import { type WorkspaceConfig } from "../../types";
import { generateNewFolderName } from "../generate-folder-name";
import { createAppConfig, type CreateAppConfigReturn } from "./create";

export async function newProjectConfig({
  workspaceConfig,
}: {
  workspaceConfig: WorkspaceConfig;
}): Promise<CreateAppConfigReturn<ProjectSubdomain>> {
  const projectName = await generateNewFolderName(workspaceConfig.projectsDir);
  return createAppConfig({
    subdomain: ProjectSubdomainSchema.parse(projectName),
    workspaceConfig,
  });
}
