import { errAsync, ok, ResultAsync, safeTry } from "neverthrow";
import fs from "node:fs/promises";

import { APP_FOLDER_NAMES, GIT_TRAILERS } from "../constants";
import { type WorkspaceConfig } from "../types";
import { absolutePathJoin } from "./absolute-path-join";
import { type AppConfigProject } from "./app-config/types";
import { templateExists } from "./app-dir-utils";
import { copyProject } from "./copy-project";
import { TypedError } from "./errors";
import { git } from "./git";
import { GitCommands } from "./git/commands";
import { ensureGitRepo } from "./git/ensure-git-repo";

export async function initializeProject(
  {
    projectConfig,
    templateName,
    workspaceConfig,
  }: {
    projectConfig: AppConfigProject;
    templateName: string;
    workspaceConfig: WorkspaceConfig;
  },
  { signal }: { signal?: AbortSignal },
) {
  return safeTry(async function* () {
    // Ensure no folder exists
    const exists = await fs
      .access(projectConfig.appDir)
      .then(() => true)
      .catch(() => false);
    if (exists) {
      return errAsync(
        new TypedError.Conflict(
          `Project directory already exists: ${projectConfig.appDir}`,
        ),
      );
    }
    yield* ResultAsync.fromPromise(
      fs.mkdir(projectConfig.appDir, { recursive: true }),
      (error) =>
        new TypedError.FileSystem(
          error instanceof Error ? error.message : "Unknown error",
          { cause: error },
        ),
    );

    const templateDir = absolutePathJoin(
      workspaceConfig.templatesDir,
      templateName,
    );

    const doesTemplateExist = await templateExists({
      folderName: templateName,
      workspaceConfig,
    });

    if (!doesTemplateExist) {
      return errAsync(
        new TypedError.NotFound(`Template does not exist: ${templateName}`),
      );
    }

    yield* copyProject({
      includePrivateFolder: false,
      isTemplate: true,
      sourceDir: templateDir,
      targetDir: projectConfig.appDir,
    });

    // Create standard directories so they appear in the file tree. Avoids agent
    // spending a tool call to create them.
    const standardDirs = [
      APP_FOLDER_NAMES.input,
      APP_FOLDER_NAMES.output,
      APP_FOLDER_NAMES.scripts,
    ];
    for (const dirName of standardDirs) {
      yield* ResultAsync.fromPromise(
        fs.mkdir(absolutePathJoin(projectConfig.appDir, dirName), {
          recursive: true,
        }),
        (error) =>
          new TypedError.FileSystem(
            error instanceof Error ? error.message : "Unknown error",
            { cause: error },
          ),
      );
    }

    yield* ensureGitRepo({ appDir: projectConfig.appDir, signal });
    yield* git(GitCommands.addAll(), projectConfig.appDir, { signal });
    yield* git(
      GitCommands.commitWithAuthor(
        `Project created from ${templateName} template\n\n${GIT_TRAILERS.initialCommit}: true\n${GIT_TRAILERS.template}: ${templateName}`,
      ),
      projectConfig.appDir,
      { signal },
    );

    return ok({ projectConfig });
  });
}
