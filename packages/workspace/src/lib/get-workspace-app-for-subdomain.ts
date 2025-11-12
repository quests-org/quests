import {
  type WorkspaceApp,
  type WorkspaceAppPreview,
  type WorkspaceAppProject,
  type WorkspaceAppSandbox,
  type WorkspaceAppVersion,
} from "../schemas/app";
import {
  type AppSubdomain,
  type PreviewSubdomain,
  type ProjectSubdomain,
  type SandboxSubdomain,
  type VersionSubdomain,
} from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";
import { createAppConfig } from "./app-config/create";
import { getAppDirTimestamps } from "./get-app-dir-timestamps";
import { projectSubdomainForSubdomain } from "./project-subdomain-for-subdomain";
import { getQuestManifest } from "./quest-manifest";
import { urlsForSubdomain } from "./url-for-subdomain";

type GetWorkspaceAppResult<T extends AppSubdomain> = T extends PreviewSubdomain
  ? WorkspaceAppPreview
  : T extends ProjectSubdomain
    ? WorkspaceAppProject
    : T extends SandboxSubdomain
      ? WorkspaceAppSandbox
      : T extends VersionSubdomain
        ? WorkspaceAppVersion
        : WorkspaceApp;

export async function getWorkspaceAppForSubdomain<T extends AppSubdomain>(
  subdomain: T,
  workspaceConfig: WorkspaceConfig,
): Promise<GetWorkspaceAppResult<T>> {
  const appConfig = createAppConfig({ subdomain, workspaceConfig });

  const timestamps = await getAppDirTimestamps(appConfig.appDir);

  const baseApp: Omit<WorkspaceApp, "project" | "subdomain"> = {
    createdAt: timestamps.createdAt,
    folderName: appConfig.folderName,
    title: appConfig.folderName,
    type: appConfig.type,
    updatedAt: timestamps.updatedAt,
    urls: urlsForSubdomain(appConfig.subdomain),
  };

  if (appConfig.type === "version" || appConfig.type === "sandbox") {
    const projectSubdomain = projectSubdomainForSubdomain(appConfig.subdomain);
    const project = await getWorkspaceAppForSubdomain(
      projectSubdomain,
      workspaceConfig,
    );
    if (appConfig.type === "version") {
      return {
        ...baseApp,
        project,
        subdomain: appConfig.subdomain,
        type: "version",
      } satisfies WorkspaceAppVersion as unknown as GetWorkspaceAppResult<T>;
    }

    return {
      ...baseApp,
      project,
      subdomain: appConfig.subdomain,
      type: "sandbox",
    } satisfies WorkspaceAppSandbox as unknown as GetWorkspaceAppResult<T>;
  }

  if (appConfig.type === "preview") {
    return {
      ...baseApp,
      subdomain: appConfig.subdomain,
      type: "preview",
    } satisfies WorkspaceAppPreview as unknown as GetWorkspaceAppResult<T>;
  }

  const questsConfig = await getQuestManifest(appConfig.appDir);
  return {
    ...baseApp,
    // Fallback to app-builder, which was the default mode before the mode field was added
    mode: questsConfig?.mode ?? "app-builder",
    subdomain: appConfig.subdomain,
    title: appConfig.folderName,
    type: appConfig.type,
    urls: urlsForSubdomain(appConfig.subdomain),
  } satisfies WorkspaceAppProject as unknown as GetWorkspaceAppResult<T>;
}
