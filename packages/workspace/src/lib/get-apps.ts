import { err, ok, type Result } from "neverthrow";
import fs from "node:fs/promises";
import path from "node:path";
import { assign, sort } from "radashi";

import {
  type WorkspaceApp,
  type WorkspaceAppPreview,
  type WorkspaceAppProject,
  type WorkspaceAppSandbox,
  type WorkspaceAppVersion,
} from "../schemas/app";
import { type AbsolutePath, type AppDir, AppDirSchema } from "../schemas/paths";
import { SubdomainPartSchema } from "../schemas/subdomain-part";
import {
  type AppSubdomain,
  AppSubdomainSchema,
  PREVIEW_SUBDOMAIN_PART,
  type PreviewSubdomain,
  PreviewSubdomainSchema,
  type ProjectSubdomain,
  ProjectSubdomainSchema,
  type SandboxSubdomain,
  SandboxSubdomainSchema,
  type VersionSubdomain,
  VersionSubdomainSchema,
} from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";
import { createAppConfig } from "./app-config/create";
import { getSandboxesDir, isRunnable } from "./app-dir-utils";
import { TypedError } from "./errors";
import { folderNameForSubdomain } from "./folder-name-for-subdomain";
import { getAppDirTimestamps } from "./get-app-dir-timestamps";
import {
  isPreviewSubdomain,
  isProjectSubdomain,
  isSandboxSubdomain,
  isVersionSubdomain,
} from "./is-app";
import { projectSubdomainForSubdomain } from "./project-subdomain-for-subdomain";
import { getQuestManifest } from "./quest-manifest";
import { urlsForSubdomain } from "./url-for-subdomain";

// Type mapping for generic subdomain to workspace app type conversion
type GetAppResult<T extends AppSubdomain> = T extends PreviewSubdomain
  ? WorkspaceAppPreview
  : T extends ProjectSubdomain
    ? WorkspaceAppProject
    : T extends SandboxSubdomain
      ? WorkspaceAppSandbox
      : T extends VersionSubdomain
        ? WorkspaceAppVersion
        : WorkspaceApp;

export async function getApp<T extends AppSubdomain>(
  subdomain: T,
  workspaceConfig: WorkspaceConfig,
): Promise<Result<GetAppResult<T>, TypedError.NotFound | TypedError.Parse>> {
  const rawFolderName = folderNameForSubdomain(subdomain);
  if (rawFolderName.isErr()) {
    return err(
      new TypedError.Parse("Invalid folder name", {
        cause: rawFolderName.error,
      }),
    );
  }

  // Handle sandbox subdomains which have format: sandbox-{name}.{project-subdomain}
  if (isSandboxSubdomain(subdomain)) {
    const [_sandboxPartialSubdomain, rawProjectSubdomain] =
      subdomain.split(".");
    const projectSubdomain = AppSubdomainSchema.parse(rawProjectSubdomain);
    if (!isProjectSubdomain(projectSubdomain)) {
      return err(new TypedError.Parse("Invalid folder name"));
    }

    // First get the project app
    const projectConfig = createAppConfig({
      subdomain: AppSubdomainSchema.parse(rawProjectSubdomain),
      workspaceConfig,
    });

    if (projectConfig.type !== "project") {
      return err(new TypedError.Parse("Invalid folder name"));
    }

    const sandboxDir = AppDirSchema.parse(
      path.resolve(getSandboxesDir(projectConfig.appDir), rawFolderName.value),
    );

    // Check if the sandbox directory exists
    try {
      await fs.access(sandboxDir);
    } catch (error) {
      return err(new TypedError.NotFound("App not found", { cause: error }));
    }

    const parent = await getApp(projectConfig.subdomain, workspaceConfig);
    if (parent.isErr()) {
      return err(parent.error);
    }

    // Create the sandbox app
    const sandboxResult = await workspaceApp({
      appDir: sandboxDir,
      parent: parent.value,
    });

    if (sandboxResult.isErr()) {
      return sandboxResult;
    }

    return ok(sandboxResult.value as GetAppResult<T>);
  }

  // Handle version subdomains which have format: version-{ref}.{project-subdomain}
  if (isVersionSubdomain(subdomain)) {
    const projectSubdomain = projectSubdomainForSubdomain(subdomain);

    // First get the project app
    const parent = await getApp(projectSubdomain, workspaceConfig);
    if (parent.isErr()) {
      return err(parent.error);
    }

    // Create the version app directly without checking directory existence
    const versionResult = await workspaceAppForVersion({
      parent: parent.value,
      subdomain,
      workspaceConfig,
    });

    if (versionResult.isErr()) {
      return versionResult;
    }

    return ok(versionResult.value as GetAppResult<T>);
  }

  // Handle preview, project, and version subdomains

  let appDir: AppDir;
  let parent: "previews" | "projects";

  if (isPreviewSubdomain(subdomain)) {
    appDir = AppDirSchema.parse(
      path.resolve(workspaceConfig.previewsDir, rawFolderName.value),
    );
    parent = "previews";
  } else if (isProjectSubdomain(subdomain)) {
    appDir = AppDirSchema.parse(
      path.resolve(workspaceConfig.projectsDir, rawFolderName.value),
    );
    parent = "projects";
  } else {
    return err(new TypedError.Parse("Invalid folder name"));
  }

  // Check if the directory exists
  try {
    await fs.access(appDir);
  } catch (error) {
    return err(new TypedError.NotFound("App not found", { cause: error }));
  }

  // Create the workspace app
  const appResult = await workspaceApp({
    appDir,
    parent,
  });

  if (appResult.isErr()) {
    return appResult;
  }

  return ok(appResult.value as GetAppResult<T>);
}

export async function getProjects(
  workspaceConfig: WorkspaceConfig,
  options: {
    direction?: "asc" | "desc";
    limit?: number;
    sortBy?: "createdAt" | "updatedAt";
  } = {},
): Promise<{ projects: WorkspaceAppProject[]; total: number }> {
  const { direction, limit, sortBy } = assign(
    {
      direction: "desc",
      sortBy: "updatedAt",
    },
    options,
  );
  const projects: WorkspaceAppProject[] = [];
  const sortByFn =
    sortBy === "createdAt"
      ? (project: WorkspaceAppProject) => project.createdAt.getTime()
      : (project: WorkspaceAppProject) => project.updatedAt.getTime();

  const projectAppDirs = await appDirsInRootDir(workspaceConfig.projectsDir);
  for (const appDir of projectAppDirs) {
    const projectApp = await workspaceApp({
      appDir,
      parent: "projects",
    });
    if (projectApp.isOk() && projectApp.value.type === "project") {
      projects.push(projectApp.value);
    }
  }

  const sortedProjects = sort(
    projects,
    (project) => (direction === "asc" ? 1 : -1) * sortByFn(project),
  );

  const total = sortedProjects.length;

  if (limit !== undefined) {
    return { projects: sortedProjects.slice(0, limit), total };
  }

  return { projects: sortedProjects, total };
}

export async function getSandboxesForProject(
  projectApp: WorkspaceAppProject,
  workspaceConfig: WorkspaceConfig,
): Promise<WorkspaceAppSandbox[]> {
  const projectConfig = createAppConfig({
    subdomain: projectApp.subdomain,
    workspaceConfig,
  });

  const sandboxesDir = getSandboxesDir(projectConfig.appDir);
  const sandboxDirs = await appDirsInRootDir(sandboxesDir);
  const sandboxes: WorkspaceAppSandbox[] = [];

  for (const sandboxDir of sandboxDirs) {
    const sandboxApp = await workspaceApp({
      appDir: sandboxDir,
      parent: projectApp,
    });
    if (sandboxApp.isOk() && sandboxApp.value.type === "sandbox") {
      sandboxes.push(sandboxApp.value);
    }
  }

  return sandboxes;
}

async function appDirsInRootDir(rootDir: AbsolutePath): Promise<AppDir[]> {
  // First check if the root dir exists
  const rootDirExists = await fs
    .stat(rootDir)
    .then(() => true)
    .catch(() => false);
  if (!rootDirExists) {
    return [];
  }

  try {
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.resolve(rootDir, entry.name))
      .map((appDir) => AppDirSchema.parse(appDir));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error reading apps folder", error);
    return [];
  }
}
async function computeAppTitle(
  appDir: AppDir,
  folderName: string,
): Promise<string> {
  try {
    const questManifest = await getQuestManifest(appDir);
    return questManifest?.name ?? folderName;
  } catch {
    return folderName;
  }
}

async function workspaceApp({
  appDir,
  parent,
}: {
  appDir: AppDir;
  parent: "previews" | "projects" | WorkspaceAppProject;
}) {
  const rawFolderName = path.basename(appDir);
  const folderNameResult = SubdomainPartSchema.safeParse(rawFolderName);

  if (!folderNameResult.success) {
    return err(new TypedError.Parse("Invalid folder name"));
  }

  if (parent === "projects") {
    const possibleSubdomain = folderNameResult.data;
    const rawSubdomain = ProjectSubdomainSchema.safeParse(possibleSubdomain);

    if (!rawSubdomain.success) {
      return err(new TypedError.Parse("Invalid folder name"));
    }

    const title = await computeAppTitle(appDir, rawFolderName);
    const questsConfig = await getQuestManifest(appDir);

    const projectApp: WorkspaceAppProject = {
      ...(await getAppDirTimestamps(appDir)),
      description: questsConfig?.description,
      folderName: rawFolderName,
      icon: questsConfig?.icon,
      isRunnable: await isRunnable(appDir),
      subdomain: rawSubdomain.data,
      title,
      type: "project",
      urls: urlsForSubdomain(rawSubdomain.data),
    };
    return ok(projectApp);
  }

  if (parent === "previews") {
    const possibleSubdomain = `${folderNameResult.data}.${PREVIEW_SUBDOMAIN_PART}`;
    const rawSubdomain = PreviewSubdomainSchema.safeParse(possibleSubdomain);

    if (!rawSubdomain.success) {
      return err(new TypedError.Parse("Invalid folder name"));
    }

    const title = await computeAppTitle(appDir, rawFolderName);

    const previewApp: WorkspaceAppPreview = {
      ...(await getAppDirTimestamps(appDir)),
      folderName: rawFolderName,
      isRunnable: await isRunnable(appDir),
      subdomain: rawSubdomain.data,
      title,
      type: "preview",
      urls: urlsForSubdomain(rawSubdomain.data),
    };
    return ok(previewApp);
  }

  const possibleSandboxSubdomain = `sandbox-${folderNameResult.data}.${parent.subdomain}`;
  const sandboxSubdomainResult = SandboxSubdomainSchema.safeParse(
    possibleSandboxSubdomain,
  );

  if (sandboxSubdomainResult.success) {
    const title = await computeAppTitle(appDir, rawFolderName);

    const sandboxApp: WorkspaceAppSandbox = {
      ...(await getAppDirTimestamps(appDir)),
      folderName: rawFolderName,
      isRunnable: await isRunnable(appDir),
      project: parent,
      subdomain: sandboxSubdomainResult.data,
      title,
      type: "sandbox",
      urls: urlsForSubdomain(sandboxSubdomainResult.data),
    };
    return ok(sandboxApp);
  }

  const possibleVersionSubdomain = `version-${folderNameResult.data}.${parent.subdomain}`;
  const versionSubdomainResult = VersionSubdomainSchema.safeParse(
    possibleVersionSubdomain,
  );

  if (versionSubdomainResult.success) {
    const title = await computeAppTitle(appDir, rawFolderName);

    const versionApp: WorkspaceAppVersion = {
      ...(await getAppDirTimestamps(appDir)),
      folderName: rawFolderName,
      isRunnable: await isRunnable(appDir),
      project: parent,
      subdomain: versionSubdomainResult.data,
      title,
      type: "version",
      urls: urlsForSubdomain(versionSubdomainResult.data),
    };
    return ok(versionApp);
  }

  return err(new TypedError.Parse("Invalid folder name"));
}

async function workspaceAppForVersion({
  parent,
  subdomain,
  workspaceConfig,
}: {
  parent: WorkspaceAppProject;
  subdomain: AppSubdomain;
  workspaceConfig: WorkspaceConfig;
}) {
  const rawFolderName = folderNameForSubdomain(subdomain);
  if (rawFolderName.isErr()) {
    return err(
      new TypedError.Parse("Invalid folder name", {
        cause: rawFolderName.error,
      }),
    );
  }

  const versionSubdomainResult = VersionSubdomainSchema.safeParse(subdomain);
  if (!versionSubdomainResult.success) {
    return err(new TypedError.Parse("Invalid folder name"));
  }

  const versionConfig = createAppConfig({
    subdomain: versionSubdomainResult.data,
    workspaceConfig,
  });

  const versionApp: WorkspaceAppVersion = {
    ...(await getAppDirTimestamps(versionConfig.appDir)),
    folderName: rawFolderName.value,
    isRunnable: await isRunnable(versionConfig.appDir),
    project: parent,
    subdomain: versionSubdomainResult.data,
    title: rawFolderName.value, // Version apps use folder name as title since they don't have physical directories
    type: "version",
    urls: urlsForSubdomain(versionSubdomainResult.data),
  };

  return ok(versionApp);
}
