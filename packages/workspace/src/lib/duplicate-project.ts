import { errAsync, ok, safeTry } from "neverthrow";
import fs from "node:fs/promises";

import { type ProjectSubdomain } from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";
import { absolutePathJoin } from "./absolute-path-join";
import { createAppConfig } from "./app-config/create";
import { newProjectConfig } from "./app-config/new";
import { getAppPrivateDir, sessionStorePath } from "./app-dir-utils";
import { TypedError } from "./errors";
import { git } from "./git";
import { GitCommands } from "./git/commands";
import { pathExists } from "./path-exists";
import { getProjectState, setProjectState } from "./project-state-store";
import { getQuestManifest, updateQuestManifest } from "./quest-manifest";

interface DuplicateProjectOptions {
  keepHistory: boolean;
  sourceSubdomain: ProjectSubdomain;
  workspaceConfig: WorkspaceConfig;
}

export async function duplicateProject(
  { keepHistory, sourceSubdomain, workspaceConfig }: DuplicateProjectOptions,
  { signal }: { signal?: AbortSignal } = {},
) {
  return safeTry(async function* () {
    const sourceConfig = createAppConfig({
      subdomain: sourceSubdomain,
      workspaceConfig,
    });

    const projectConfig = await newProjectConfig({
      workspaceConfig,
    });

    const projectExists = await pathExists(projectConfig.appDir);
    if (projectExists) {
      return errAsync(
        new TypedError.Conflict(
          `Project directory already exists: ${projectConfig.appDir}`,
        ),
      );
    }

    const sourceExists = await pathExists(sourceConfig.appDir);
    if (!sourceExists) {
      return errAsync(
        new TypedError.NotFound(
          `Source project directory does not exist: ${sourceConfig.appDir}`,
        ),
      );
    }

    const statusResult = yield* git(GitCommands.status(), sourceConfig.appDir, {
      signal,
    });

    if (statusResult.stdout.toString("utf8").trim() !== "") {
      yield* git(GitCommands.addAll(), sourceConfig.appDir, { signal });
      yield* git(
        GitCommands.commitWithAuthor("Auto-commit before duplicate"),
        sourceConfig.appDir,
        { signal },
      );
    }

    yield* git(
      GitCommands.cloneWithoutRemote(sourceConfig.appDir, projectConfig.appDir),
      workspaceConfig.rootDir,
      { signal },
    );

    const sourceManifest = await getQuestManifest(sourceConfig.appDir);
    const sourceName = sourceManifest?.name || sourceConfig.subdomain;
    const duplicateName = `Copy of ${sourceName}`;

    if (keepHistory) {
      const sourceSessionDbPath = sessionStorePath(sourceConfig.appDir);
      const targetSessionDbPath = sessionStorePath(projectConfig.appDir);

      if (await pathExists(sourceSessionDbPath)) {
        const targetPrivateDir = getAppPrivateDir(projectConfig.appDir);
        await fs.mkdir(targetPrivateDir, { recursive: true });
        await fs.copyFile(sourceSessionDbPath, targetSessionDbPath);
      }

      const sourceProjectState = await getProjectState(sourceConfig.appDir);
      await setProjectState(projectConfig.appDir, sourceProjectState);
      await updateQuestManifest(projectConfig.subdomain, workspaceConfig, {
        name: duplicateName,
      });
      yield* git(GitCommands.addAll(), projectConfig.appDir, { signal });
      yield* git(
        GitCommands.commitWithAuthor(`Rename to "${duplicateName}"`),
        projectConfig.appDir,
        { signal },
      );
    } else {
      // Remove .git directory to clear history
      const gitDir = absolutePathJoin(projectConfig.appDir, ".git");
      await fs.rm(gitDir, { force: true, recursive: true });

      // Preserve the selected model from the source project
      const sourceProjectState = await getProjectState(sourceConfig.appDir);
      if (sourceProjectState.selectedModelURI) {
        await setProjectState(projectConfig.appDir, {
          selectedModelURI: sourceProjectState.selectedModelURI,
        });
      }

      await updateQuestManifest(projectConfig.subdomain, workspaceConfig, {
        name: duplicateName,
      });
      yield* git(GitCommands.init(), projectConfig.appDir, { signal });
      yield* git(GitCommands.addAll(), projectConfig.appDir, { signal });
      yield* git(
        GitCommands.commitWithAuthor(`Initial commit of ${duplicateName}`),
        projectConfig.appDir,
        { signal },
      );
    }

    return ok({ projectConfig });
  });
}
