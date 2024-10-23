import fs from "node:fs/promises";
import path from "node:path";

import {
  APP_PRIVATE_FOLDER,
  REGISTRY_APPS_FOLDER,
  REGISTRY_TEMPLATES_FOLDER,
  SANDBOXES_FOLDER,
  SESSIONS_DB_FILE_NAME,
} from "../constants";
import { type AbsolutePath, type AppDir } from "../schemas/paths";
import { type WorkspaceConfig } from "../types";
import { absolutePathJoin } from "./absolute-path-join";

export function getAppPrivateDir(appDir: AppDir): AbsolutePath {
  return absolutePathJoin(appDir, APP_PRIVATE_FOLDER);
}

export function getSandboxesDir(appDir: AppDir): AbsolutePath {
  return absolutePathJoin(getAppPrivateDir(appDir), SANDBOXES_FOLDER);
}

export function isRunnable(appDir: AppDir): Promise<boolean> {
  return fs
    .access(path.join(appDir, "package.json"))
    .then(() => true)
    .catch(() => false);
}

export function registryAppExists({
  folderName,
  workspaceConfig,
}: {
  folderName: string;
  workspaceConfig: WorkspaceConfig;
}): Promise<boolean> {
  const registryAppsDir = absolutePathJoin(
    absolutePathJoin(workspaceConfig.registryDir, REGISTRY_APPS_FOLDER),
    folderName,
  );
  return fs
    .access(registryAppsDir)
    .then(() => true)
    .catch(() => false);
}

export function sessionStorePath(appDir: AppDir): AbsolutePath {
  return absolutePathJoin(getAppPrivateDir(appDir), SESSIONS_DB_FILE_NAME);
}

export function templateExists({
  folderName,
  workspaceConfig,
}: {
  folderName: string;
  workspaceConfig: WorkspaceConfig;
}): Promise<boolean> {
  const templateDir = absolutePathJoin(
    workspaceConfig.registryDir,
    REGISTRY_TEMPLATES_FOLDER,
    folderName,
  );
  return fs
    .access(templateDir)
    .then(() => true)
    .catch(() => false);
}
