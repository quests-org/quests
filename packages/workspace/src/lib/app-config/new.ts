import { type SubdomainPart } from "../../schemas/subdomain-part";
import {
  type ProjectSubdomain,
  ProjectSubdomainSchema,
} from "../../schemas/subdomains";
import { type WorkspaceConfig } from "../../types";
import { createAppConfig, type CreateAppConfigReturn } from "./create";

export function newProjectConfig({
  folderName,
  workspaceConfig,
}: {
  folderName: SubdomainPart;
  workspaceConfig: WorkspaceConfig;
}): CreateAppConfigReturn<ProjectSubdomain> {
  return createAppConfig({
    subdomain: ProjectSubdomainSchema.parse(folderName),
    workspaceConfig,
  });
}
