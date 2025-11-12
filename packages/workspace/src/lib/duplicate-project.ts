import { DEFAULT_THEME_GRADIENT, THEMES } from "@quests/shared/icons";
import { errAsync, ok, safeTry } from "neverthrow";
import fs from "node:fs/promises";
import { draw } from "radashi";

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

    const sourceGitDir = absolutePathJoin(sourceConfig.appDir, ".git");
    const hasGitRepo = await pathExists(sourceGitDir);

    if (hasGitRepo) {
      const statusResult = yield* git(
        GitCommands.status(),
        sourceConfig.appDir,
        {
          signal,
        },
      );

      if (statusResult.stdout.toString("utf8").trim() !== "") {
        yield* git(GitCommands.addAll(), sourceConfig.appDir, { signal });
        yield* git(
          GitCommands.commitWithAuthor("Auto-commit before duplicate"),
          sourceConfig.appDir,
          { signal },
        );
      }
    } else {
      yield* git(GitCommands.init(), sourceConfig.appDir, { signal });
      yield* git(GitCommands.addAll(), sourceConfig.appDir, { signal });
      yield* git(
        GitCommands.commitWithAuthor("Initial commit"),
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

    const sourceProjectState = await getProjectState(sourceConfig.appDir);

    if (keepHistory) {
      const sourceSessionDbPath = sessionStorePath(sourceConfig.appDir);
      const targetSessionDbPath = sessionStorePath(projectConfig.appDir);

      if (await pathExists(sourceSessionDbPath)) {
        const targetPrivateDir = getAppPrivateDir(projectConfig.appDir);
        await fs.mkdir(targetPrivateDir, { recursive: true });
        await fs.copyFile(sourceSessionDbPath, targetSessionDbPath);
      }

      await setProjectState(projectConfig.appDir, sourceProjectState);
    } else {
      // Remove .git directory to clear history
      const gitDir = absolutePathJoin(projectConfig.appDir, ".git");
      await fs.rm(gitDir, { force: true, recursive: true });

      // Preserve only the selected model from the source project
      if (sourceProjectState.selectedModelURI) {
        await setProjectState(projectConfig.appDir, {
          selectedModelURI: sourceProjectState.selectedModelURI,
        });
      }

      yield* git(GitCommands.init(), projectConfig.appDir, { signal });
    }

    const existingManifest = await getQuestManifest(projectConfig.appDir);
    const currentTheme = existingManifest?.icon?.background;

    // Pick a random theme that's different from the current one
    const availableThemes = currentTheme
      ? THEMES.filter((theme) => theme !== currentTheme)
      : THEMES;
    const randomTheme = draw(availableThemes) ?? DEFAULT_THEME_GRADIENT;

    await updateQuestManifest(projectConfig.subdomain, workspaceConfig, {
      icon: {
        background: randomTheme,
        lucide: existingManifest?.icon?.lucide,
      },
      name: duplicateName,
    });

    yield* git(GitCommands.addAll(), projectConfig.appDir, { signal });
    const commitMessage = keepHistory
      ? `Duplicated from "${sourceName}"`
      : `Initial commit of duplicated project "${duplicateName}"`;
    yield* git(
      GitCommands.commitWithAuthor(commitMessage),
      projectConfig.appDir,
      { signal },
    );

    return ok({ projectConfig });
  });
}
