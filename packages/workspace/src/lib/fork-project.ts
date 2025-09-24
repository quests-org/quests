import { errAsync, ok, safeTry } from "neverthrow";
import fs from "node:fs/promises";

import { createAppConfig } from "../lib/app-config/create";
import { newProjectConfig } from "../lib/app-config/new";
import { TypedError } from "../lib/errors";
import { git } from "../lib/git";
import { GitCommands } from "../lib/git/commands";
import { getQuestManifest, updateQuestManifest } from "../lib/quest-manifest";
import { type ProjectSubdomain } from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";

interface ForkProjectOptions {
  sourceSubdomain: ProjectSubdomain;
  workspaceConfig: WorkspaceConfig;
}

export async function forkProject(
  { sourceSubdomain, workspaceConfig }: ForkProjectOptions,
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

    const projectExists = await fs
      .access(projectConfig.appDir)
      .then(() => true)
      .catch(() => false);
    if (projectExists) {
      return errAsync(
        new TypedError.Conflict(
          `Project directory already exists: ${projectConfig.appDir}`,
        ),
      );
    }

    const sourceExists = await fs
      .access(sourceConfig.appDir)
      .then(() => true)
      .catch(() => false);
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
        GitCommands.commitWithAuthor("Auto-commit before fork"),
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
    const forkName = `Fork of ${sourceName}`;

    await updateQuestManifest(projectConfig.subdomain, workspaceConfig, {
      name: forkName,
    });

    yield* git(GitCommands.addAll(), projectConfig.appDir, { signal });
    yield* git(
      GitCommands.commitWithAuthor(`Rename to "${forkName}"`),
      projectConfig.appDir,
      { signal },
    );

    return ok({ projectConfig });
  });
}
