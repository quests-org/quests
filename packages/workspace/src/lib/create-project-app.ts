import { errAsync, ok, ResultAsync, safeTry } from "neverthrow";
import fs from "node:fs/promises";

import { REGISTRY_TEMPLATES_FOLDER } from "../constants";
import { type WorkspaceConfig } from "../types";
import { absolutePathJoin } from "./absolute-path-join";
import { type AppConfigProject } from "./app-config/types";
import { templateExists } from "./app-dir-utils";
import { copyProject } from "./copy-project";
import { TypedError } from "./errors";
import { git } from "./git";
import { GitCommands } from "./git/commands";

export async function createProjectApp(
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
      workspaceConfig.registryDir,
      REGISTRY_TEMPLATES_FOLDER,
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
      isTemplate: true,
      sourceDir: templateDir,
      targetDir: projectConfig.appDir,
    });

    yield* git(GitCommands.init(), projectConfig.appDir, { signal });
    yield* git(GitCommands.addAll(), projectConfig.appDir, { signal });
    yield* git(
      GitCommands.commitWithAuthor(
        `Project created from ${templateName} template`,
      ),
      projectConfig.appDir,
      { signal },
    );

    return ok({ projectConfig });
  });
}
