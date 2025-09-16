import { err, ok } from "neverthrow";
import { z } from "zod";

import { type ProjectSubdomain } from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";
import { createAppConfig } from "./app-config/create";
import { TypedError } from "./errors";
import { git } from "./git";
import { GitCommands } from "./git/commands";

export const GitRefInfoSchema = z.object({
  commitMessage: z.string(),
  files: z.array(
    z.object({
      additions: z.number(),
      deletions: z.number(),
      filename: z.string(),
      status: z.enum(["added", "deleted", "modified"]),
    }),
  ),
  summary: z.object({
    additions: z.number(),
    deletions: z.number(),
    filesChanged: z.number(),
  }),
});

type GitRefInfo = z.output<typeof GitRefInfoSchema>;

export async function getGitRefInfo(
  projectSubdomain: ProjectSubdomain,
  gitRef: string,
  workspaceConfig: WorkspaceConfig,
) {
  const projectConfig = createAppConfig({
    subdomain: projectSubdomain,
    workspaceConfig,
  });

  const refResult = await git(
    GitCommands.verifyCommitRef(gitRef),
    projectConfig.appDir,
    { signal: AbortSignal.timeout(5000) },
  );

  if (refResult.isErr()) {
    return err(
      new TypedError.NotFound("Ref not found", { cause: refResult.error }),
    );
  }

  const commitMessageResult = await git(
    GitCommands.getCommitMessage(gitRef),
    projectConfig.appDir,
    { signal: AbortSignal.timeout(5000) },
  );

  if (commitMessageResult.isErr()) {
    return err(
      new TypedError.Git("Error getting commit message", {
        cause: commitMessageResult.error,
      }),
    );
  }

  const commitMessage = commitMessageResult.value.stdout.toString().trim();

  // Check if this is the first commit by counting commits
  const commitCountResult = await git(
    GitCommands.revList(gitRef),
    projectConfig.appDir,
    { signal: AbortSignal.timeout(5000) },
  );

  if (commitCountResult.isErr()) {
    return err(
      new TypedError.Git("Error getting commit count", {
        cause: commitCountResult.error,
      }),
    );
  }

  const commitCount = Number.parseInt(
    commitCountResult.value.stdout.toString().trim(),
    10,
  );
  const isFirstCommit = commitCount === 1;

  const numstatCommand = isFirstCommit
    ? GitCommands.showNumstat(gitRef)
    : GitCommands.diffNumstat(gitRef);

  const numstatResult = await git(numstatCommand, projectConfig.appDir, {
    signal: AbortSignal.timeout(10_000),
  });

  if (numstatResult.isErr()) {
    return err(
      new TypedError.Git("Error getting numstat", {
        cause: numstatResult.error,
      }),
    );
  }

  const numstatOutput = numstatResult.value.stdout.toString().trim();

  const files: GitRefInfo["files"] = [];
  let totalAdditions = 0;
  let totalDeletions = 0;

  if (numstatOutput) {
    const lines = numstatOutput.split("\n");

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      const parts = line.split("\t");
      if (parts.length < 3) {
        continue;
      }

      const [additionsStr, deletionsStr, filename = ""] = parts;

      const additions =
        additionsStr === "-" ? 0 : Number.parseInt(additionsStr ?? "0", 10);
      const deletions =
        deletionsStr === "-" ? 0 : Number.parseInt(deletionsStr ?? "0", 10);

      if (Number.isNaN(additions) || Number.isNaN(deletions)) {
        continue;
      }

      let status: GitRefInfo["files"][0]["status"] = "modified";
      if (isFirstCommit) {
        status = "added";
      } else if (additions > 0 && deletions === 0) {
        status = "added";
      } else if (additions === 0 && deletions > 0) {
        status = "deleted";
      }

      files.push({
        additions,
        deletions,
        filename,
        status,
      });

      totalAdditions += additions;
      totalDeletions += deletions;
    }
  }

  return ok({
    commitMessage,
    files,
    summary: {
      additions: totalAdditions,
      deletions: totalDeletions,
      filesChanged: files.length,
    },
  } satisfies GitRefInfo);
}
