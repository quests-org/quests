import ms from "ms";
import { err, ok, safeTry } from "neverthrow";

import { type ProjectSubdomain } from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";
import { createAppConfig } from "./app-config/create";
import { TypedError } from "./errors";
import { git } from "./git";
import { GitCommands } from "./git/commands";

export async function getFilesAddedSinceInitial(
  projectSubdomain: ProjectSubdomain,
  workspaceConfig: WorkspaceConfig,
) {
  return safeTry(async function* () {
    const projectConfig = createAppConfig({
      subdomain: projectSubdomain,
      workspaceConfig,
    });

    // Step 1: Find the initial commit using the trailer
    const findInitialResult = yield* git(
      GitCommands.findInitialCommit(),
      projectConfig.appDir,
      { signal: AbortSignal.timeout(ms("5 seconds")) },
    );

    const initialCommitHash = findInitialResult.stdout.toString().trim();
    if (!initialCommitHash) {
      // No initial commit found (e.g., older imported project)
      return err(
        new TypedError.NotFound("Initial commit not found", {
          cause: "No commit with initial commit trailer",
        }),
      );
    }

    // Step 2: Get diff of files between initial commit and HEAD
    // Using --diff-filter=A to only show added files
    const diffResult = yield* git(
      ["diff", "--name-only", "--diff-filter=A", initialCommitHash, "HEAD"],
      projectConfig.appDir,
      { signal: AbortSignal.timeout(ms("5 seconds")) },
    );

    const output = diffResult.stdout.toString().trim();
    if (!output) {
      return ok(0);
    }

    const fileCount = output.split("\n").length;
    return ok(fileCount);
  });
}
