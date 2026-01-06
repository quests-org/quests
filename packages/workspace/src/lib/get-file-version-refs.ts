import ms from "ms";
import { ok, safeTry } from "neverthrow";

import { type RelativePath } from "../schemas/paths";
import { type ProjectSubdomain } from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";
import { createAppConfig } from "./app-config/create";
import { TypedError } from "./errors";
import { git } from "./git";
import { GitCommands } from "./git/commands";

export async function getFileVersionRefs(
  projectSubdomain: ProjectSubdomain,
  filePath: RelativePath,
  workspaceConfig: WorkspaceConfig,
) {
  const projectConfig = createAppConfig({
    subdomain: projectSubdomain,
    workspaceConfig,
  });

  return safeTry(async function* () {
    const versionRefsResult = yield* git(
      GitCommands.logFileAllRefs(filePath),
      projectConfig.appDir,
      { signal: AbortSignal.timeout(ms("5 seconds")) },
    ).mapErr(
      (error) =>
        new TypedError.Git("Error getting file version refs", {
          cause: error,
        }),
    );

    const refs = versionRefsResult.stdout
      .toString()
      .trim()
      .split("\n")
      .filter((ref) => ref.length > 0);

    return ok(refs);
  });
}
