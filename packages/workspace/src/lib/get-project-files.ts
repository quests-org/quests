import ms from "ms";
import { err, ok } from "neverthrow";
import path from "node:path";
import { z } from "zod";

import { type ProjectSubdomain } from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";
import { createAppConfig } from "./app-config/create";
import { TypedError } from "./errors";
import { getMimeType } from "./get-mime-type";
import { git } from "./git";
import { GitCommands } from "./git/commands";

const ProjectFileSchema = z.object({
  filename: z.string(),
  filePath: z.string(),
  mimeType: z.string(),
});

export const ProjectFilesSchema = z.array(ProjectFileSchema);

export async function getProjectFiles(
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
      new TypedError.Git("Error listing project files", {
        cause: result.error,
      }),
    );
  }

  const output = result.value.stdout.toString().trim();
  if (!output) {
    return ok([]);
  }

  const files = output
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((filePath) => ({
      filename: path.basename(filePath),
      filePath,
      mimeType: getMimeType(filePath),
    }));

  return ok(files);
}
