import { type SubdomainPart } from "../../schemas/subdomain-part";
import {
  type ProjectSubdomain,
  ProjectSubdomainSchema,
} from "../../schemas/subdomains";
import { type WorkspaceConfig } from "../../types";
import { absolutePathJoin } from "../absolute-path-join";
import { generateNewFolderName } from "../generate-folder-name";
import { pathExists } from "../path-exists";
import { createAppConfig, type CreateAppConfigReturn } from "./create";

export async function newProjectConfig({
  preferredFolderName,
  workspaceConfig,
}: {
  preferredFolderName?: SubdomainPart;
  workspaceConfig: WorkspaceConfig;
}): Promise<CreateAppConfigReturn<ProjectSubdomain>> {
  const rawSubdomain =
    preferredFolderName &&
    !(await pathExists(
      absolutePathJoin(workspaceConfig.projectsDir, preferredFolderName),
    ))
      ? preferredFolderName
      : await generateNewFolderName(workspaceConfig.projectsDir);

  return createAppConfig({
    subdomain: ProjectSubdomainSchema.parse(rawSubdomain),
    workspaceConfig,
  });
}
