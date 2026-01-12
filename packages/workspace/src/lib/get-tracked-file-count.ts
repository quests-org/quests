import ms from "ms";
import { err, ok } from "neverthrow";

import { type ProjectSubdomain } from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";
import { createAppConfig } from "./app-config/create";
import { TypedError } from "./errors";
import { git } from "./git";
import { GitCommands } from "./git/commands";

export async function getTrackedFileCount(
  projectSubdomain: ProjectSubdomain,
  workspaceConfig: WorkspaceConfig,
) {
  const projectConfig = createAppConfig({
    subdomain: projectSubdomain,
    workspaceConfig,
  });

  const result = await git(GitCommands.lsFiles(), projectConfig.appDir, {
    signal: AbortSignal.timeout(ms("5 seconds")),
  });

  if (result.isErr()) {
    return err(
      new TypedError.Git("Error getting tracked files", {
        cause: result.error,
      }),
    );
  }

  const output = result.value.stdout.toString().trim();
  if (!output) {
    return ok(0);
  }

  const fileCount = output.split("\n").length;
  return ok(fileCount);
}
