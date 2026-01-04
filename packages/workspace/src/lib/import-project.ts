import { PROJECT_CONFIG_FILE_NAME } from "@quests/shared";
import { errAsync, ok, safeTry } from "neverthrow";
import { ulid } from "ulid";

import { AbsolutePathSchema, AppDirSchema } from "../schemas/paths";
import { ProjectSubdomainSchema } from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";
import { absolutePathJoin } from "./absolute-path-join";
import { copyProject } from "./copy-project";
import { TypedError } from "./errors";
import { folderNameForSubdomain } from "./folder-name-for-subdomain";
import { git } from "./git";
import { GitCommands } from "./git/commands";
import { ensureGitRepo } from "./git/ensure-git-repo";
import { pathExists } from "./path-exists";

interface ImportProjectOptions {
  sourcePath: string;
  workspaceConfig: WorkspaceConfig;
}

export async function importProject(
  { sourcePath: rawSourcePath, workspaceConfig }: ImportProjectOptions,
  { signal }: { signal?: AbortSignal } = {},
) {
  return safeTry(async function* () {
    const sourcePath = AbsolutePathSchema.parse(rawSourcePath);

    const sourceExists = await pathExists(sourcePath);
    if (!sourceExists) {
      return errAsync(
        new TypedError.NotFound(
          `Source directory does not exist: ${sourcePath}`,
        ),
      );
    }

    const questManifestPath = absolutePathJoin(
      sourcePath,
      PROJECT_CONFIG_FILE_NAME,
    );
    const hasQuestManifest = await pathExists(questManifestPath);
    if (!hasQuestManifest) {
      return errAsync(
        new TypedError.NotFound(
          `Source directory does not contain ${PROJECT_CONFIG_FILE_NAME}`,
        ),
      );
    }

    const subdomain = ProjectSubdomainSchema.parse(
      `import-${ulid().toLowerCase()}`,
    );

    const folderNameResult = folderNameForSubdomain(subdomain);
    if (folderNameResult.isErr()) {
      return errAsync(
        new TypedError.Parse(`Invalid subdomain format: ${subdomain}`),
      );
    }
    const folderName = folderNameResult.value;

    const projectDir = AppDirSchema.parse(
      absolutePathJoin(workspaceConfig.projectsDir, folderName),
    );

    const projectExists = await pathExists(projectDir);
    if (projectExists) {
      return errAsync(
        new TypedError.Conflict(
          `Project directory already exists: ${projectDir}`,
        ),
      );
    }

    yield* copyProject({
      includePrivateFolder: true,
      isTemplate: false,
      sourceDir: sourcePath,
      targetDir: projectDir,
    });

    const ensureResult = yield* ensureGitRepo({
      appDir: projectDir,
      signal,
    });

    if (ensureResult.created) {
      yield* git(GitCommands.addAll(), projectDir, { signal });
      // If "import" is used literally at the end of a string, it will cause an
      // unterminated string literal error with Electron Vite.
      const reservedWord = "import";
      yield* git(
        GitCommands.commitWithAuthor(`Initial commit after ${reservedWord}`),
        projectDir,
        { signal },
      );
    }

    return ok({ projectConfig: { appDir: projectDir, subdomain } });
  });
}
