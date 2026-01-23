import { ok, safeTry } from "neverthrow";

import {
  APP_FOLDER_NAMES,
  LEGACY_PROJECT_SUBDOMAIN_MODE_PREFIXES,
} from "../constants";
import { type ProjectSubdomain } from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";
import { createAppConfig } from "./app-config/create";
import { isRunnable } from "./app-dir-utils";
import { git } from "./git";
import { GitCommands } from "./git/commands";

export async function hasAppModifications(
  projectSubdomain: ProjectSubdomain,
  workspaceConfig: WorkspaceConfig,
) {
  return safeTry(async function* () {
    const projectConfig = createAppConfig({
      subdomain: projectSubdomain,
      workspaceConfig,
    });

    if (
      projectSubdomain.startsWith(
        `${LEGACY_PROJECT_SUBDOMAIN_MODE_PREFIXES.chat}-`,
      )
    ) {
      return ok(false);
    }

    // Check if git repo exists
    const hasGitRepo = await git(
      GitCommands.isInsideWorkTree(),
      projectConfig.appDir,
      { signal: AbortSignal.timeout(10_000) },
    );

    if (hasGitRepo.isErr()) {
      if (await isRunnable(projectConfig.appDir)) {
        // Runnable, no git repo, assume modifications exist
        return ok(true);
      }
      return ok(false);
    }

    // Check for uncommitted changes in src/ directory
    const statusResult = yield* git(
      GitCommands.statusPath(`${APP_FOLDER_NAMES.src}/`),
      projectConfig.appDir,
      { signal: AbortSignal.timeout(10_000) },
    );

    const statusOutput = statusResult.stdout.toString().trim();
    if (statusOutput) {
      // There are uncommitted changes in src/
      return ok(true);
    }

    // Find the initial commit using the trailer
    const findInitialResult = yield* git(
      GitCommands.findInitialCommit(),
      projectConfig.appDir,
      { signal: AbortSignal.timeout(10_000) },
    );

    const initialCommitHash = findInitialResult.stdout.toString().trim();
    if (!initialCommitHash) {
      // No initial commit found (e.g., imported project), assume modifications exist
      return ok(true);
    }

    // Check for commits modifying src/ since the initial commit
    const logResult = yield* git(
      GitCommands.logPathSinceCommit(
        initialCommitHash,
        `${APP_FOLDER_NAMES.src}/`,
      ),
      projectConfig.appDir,
      { signal: AbortSignal.timeout(10_000) },
    );

    const logOutput = logResult.stdout.toString().trim();
    // If there are any commits, src/ has been modified
    return ok(logOutput.length > 0);
  });
}
