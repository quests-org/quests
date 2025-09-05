import path from "node:path";

import { AppDirSchema } from "../../schemas/paths";
import {
  type AppSubdomain,
  type PreviewSubdomain,
  type ProjectSubdomain,
  type SandboxSubdomain,
  type VersionSubdomain,
} from "../../schemas/subdomains";
import { type WorkspaceConfig } from "../../types";
import { getSandboxesDir } from "../app-dir-utils";
import { folderNameForSubdomain } from "../folder-name-for-subdomain";
import {
  isPreviewSubdomain,
  isProjectSubdomain,
  isSandboxSubdomain,
  isVersionSubdomain,
} from "../is-app";
import { projectSubdomainForSubdomain } from "../project-subdomain-for-subdomain";
import { type AppConfig } from "./types";

export type CreateAppConfigReturn<T extends AppSubdomain> =
  T extends PreviewSubdomain
    ? PreviewConfig
    : T extends ProjectSubdomain
      ? ProjectConfig
      : T extends SandboxSubdomain
        ? SandboxConfig
        : T extends VersionSubdomain
          ? VersionConfig
          : never;
type PreviewConfig = Extract<AppConfig, { type: "preview" }>;
type ProjectConfig = Extract<AppConfig, { type: "project" }>;
type SandboxConfig = Extract<AppConfig, { type: "sandbox" }>;
type VersionConfig = Extract<AppConfig, { type: "version" }>;

export function createAppConfig<T extends AppSubdomain>({
  subdomain,
  workspaceConfig,
}: {
  subdomain: T;
  workspaceConfig: WorkspaceConfig;
}): CreateAppConfigReturn<T> {
  if (isProjectSubdomain(subdomain)) {
    return createProjectConfig(
      subdomain,
      workspaceConfig,
    ) as CreateAppConfigReturn<T>;
  }

  if (isPreviewSubdomain(subdomain)) {
    return createPreviewConfig(
      subdomain,
      workspaceConfig,
    ) as CreateAppConfigReturn<T>;
  }

  if (isSandboxSubdomain(subdomain)) {
    return createSandboxConfig(
      subdomain,
      workspaceConfig,
    ) as CreateAppConfigReturn<T>;
  }

  if (isVersionSubdomain(subdomain)) {
    return createVersionConfig(
      subdomain,
      workspaceConfig,
    ) as CreateAppConfigReturn<T>;
  }

  throw new Error(`Invalid subdomain format: ${subdomain}`);
}

function createPreviewConfig(
  subdomain: PreviewSubdomain,
  workspaceConfig: WorkspaceConfig,
): PreviewConfig {
  const folderNameResult = folderNameForSubdomain(subdomain);
  if (folderNameResult.isErr()) {
    throw new Error(`Invalid preview subdomain format: ${subdomain}`);
  }
  const folderName = folderNameResult.value;
  return {
    appDir: AppDirSchema.parse(
      path.join(workspaceConfig.previewsDir, folderName),
    ),
    folderName,
    subdomain,
    type: "preview",
    workspaceConfig,
  };
}

function createProjectConfig(
  subdomain: ProjectSubdomain,
  workspaceConfig: WorkspaceConfig,
): ProjectConfig {
  const folderNameResult = folderNameForSubdomain(subdomain);
  if (folderNameResult.isErr()) {
    throw new Error(`Invalid project subdomain format: ${subdomain}`);
  }
  const folderName = folderNameResult.value;
  return {
    appDir: AppDirSchema.parse(
      path.join(workspaceConfig.projectsDir, folderName),
    ),
    folderName,
    subdomain,
    type: "project",
    workspaceConfig,
  };
}

function createSandboxConfig(
  subdomain: SandboxSubdomain,
  workspaceConfig: WorkspaceConfig,
): SandboxConfig {
  const folderNameResult = folderNameForSubdomain(subdomain);
  if (folderNameResult.isErr()) {
    throw new Error(`Invalid sandbox subdomain format: ${subdomain}`);
  }
  const folderName = folderNameResult.value;

  const projectSubdomain = projectSubdomainForSubdomain(subdomain);

  const projectConfig = createAppConfig({
    subdomain: projectSubdomain,
    workspaceConfig,
  });

  return {
    appDir: AppDirSchema.parse(
      path.join(getSandboxesDir(projectConfig.appDir), folderName),
    ),
    folderName,
    subdomain,
    type: "sandbox",
    workspaceConfig,
  };
}

function createVersionConfig(
  subdomain: VersionSubdomain,
  workspaceConfig: WorkspaceConfig,
): VersionConfig {
  const parts = subdomain.split(".");
  if (parts.length !== 2) {
    throw new Error(`Invalid version subdomain format: ${subdomain}`);
  }
  const [versionPart, projectPart] = parts;
  if (!versionPart || !projectPart) {
    throw new Error(`Invalid version subdomain format: ${subdomain}`);
  }

  if (!isValidProjectPart(projectPart)) {
    throw new Error(`Invalid project part in version subdomain: ${subdomain}`);
  }

  const projectConfig = createAppConfig({
    subdomain: projectPart,
    workspaceConfig,
  });

  const versionName = versionPart.slice("version-".length);
  return {
    appDir: AppDirSchema.parse(
      path.join(getSandboxesDir(projectConfig.appDir), versionName),
    ),
    folderName: versionName,
    subdomain,
    type: "version",
    workspaceConfig,
  };
}

function isValidProjectPart(part: string): part is ProjectSubdomain {
  return part.length > 0 && !part.includes(".");
}
