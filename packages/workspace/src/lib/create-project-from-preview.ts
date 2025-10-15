import { errAsync, ok, safeTry } from "neverthrow";
import fs from "node:fs/promises";

import { newProjectConfig } from "../lib/app-config/new";
import { copyTemplate } from "../lib/copy-template";
import { TypedError } from "../lib/errors";
import { git } from "../lib/git";
import { GitCommands } from "../lib/git/commands";
import { Store } from "../lib/store";
import { type Session } from "../schemas/session";
import { type StoreId } from "../schemas/store-id";
import { type WorkspaceConfig } from "../types";
import { type AppConfigPreview } from "./app-config/types";

interface CreateProjectFromPreviewOptions {
  previewConfig: AppConfigPreview;
  sessionId: StoreId.Session;
  workspaceConfig: WorkspaceConfig;
}

export async function createProjectFromPreview(
  {
    previewConfig,
    sessionId,
    workspaceConfig,
  }: CreateProjectFromPreviewOptions,
  { signal }: { signal?: AbortSignal } = {},
) {
  return safeTry(async function* () {
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

    const previewExists = await fs
      .access(previewConfig.appDir)
      .then(() => true)
      .catch(() => false);
    if (!previewExists) {
      return errAsync(
        new TypedError.NotFound(
          `Preview directory does not exist: ${previewConfig.appDir}`,
        ),
      );
    }

    yield* copyTemplate({
      targetDir: projectConfig.appDir,
      templateDir: previewConfig.appDir,
    }).orElse((error) => {
      return errAsync(
        new TypedError.FileSystem(error.message, { cause: error }),
      );
    });

    yield* git(GitCommands.init(), projectConfig.appDir, { signal });

    yield* git(GitCommands.addAll(), projectConfig.appDir, { signal });
    yield* git(
      GitCommands.commitWithAuthor(
        `First version of ${previewConfig.folderName}`,
      ),
      projectConfig.appDir,
      { signal },
    );

    const session: Session.Type = {
      createdAt: new Date(),
      id: sessionId,
      title: `Created from ${previewConfig.folderName} template`,
    };

    yield* Store.saveSession(session, projectConfig);

    return ok({ projectConfig });
  });
}
