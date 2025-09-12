import { err, ok } from "neverthrow";
import { sift } from "radashi";
import { z } from "zod";

import { type ProjectSubdomain } from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";
import { createAppConfig } from "./app-config/create";
import { git } from "./git";
import { GitCommands } from "./git/commands";

const GitCommitSchema = z.object({
  author: z.string(),
  createdAt: z.date(),
  email: z.string(),
  hash: z.string(),
  message: z.string(),
});

export const GitCommitsSchema = z.object({
  commits: z.array(GitCommitSchema),
});

export async function getGitCommits(
  projectSubdomain: ProjectSubdomain,
  workspaceConfig: WorkspaceConfig,
  limit?: number,
) {
  const projectConfig = createAppConfig({
    subdomain: projectSubdomain,
    workspaceConfig,
  });

  const logResult = await git(
    GitCommands.logWithDetails(limit),
    projectConfig.appDir,
    { signal: AbortSignal.timeout(10_000) },
  );

  if (logResult.isErr()) {
    return err({
      message: "Error getting git commits",
      type: "git-error" as const,
    });
  }

  const logOutput = logResult.value.stdout.toString().trim();

  if (!logOutput) {
    return ok({ commits: [] });
  }

  const commits = sift(
    logOutput.split("\n").map((line) => {
      const parts = line.split("|");
      if (parts.length !== 5) {
        return null;
      }

      const [hash, author, email, timestampStr, message] = parts;

      if (!hash || !author || !email || !timestampStr || !message) {
        return null;
      }
      const timestamp = Number.parseInt(timestampStr, 10);

      if (Number.isNaN(timestamp)) {
        return null;
      }

      return {
        author,
        createdAt: new Date(timestamp * 1000),
        email,
        hash,
        message,
      };
    }),
  );

  return ok({ commits });
}
