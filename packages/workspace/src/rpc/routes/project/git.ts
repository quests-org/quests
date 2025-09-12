import { call, eventIterator } from "@orpc/server";
import { z } from "zod";

import { getGitCommits, GitCommitsSchema } from "../../../lib/get-git-commits";
import { getGitRefInfo, GitRefInfoSchema } from "../../../lib/get-git-ref-info";
import { ProjectSubdomainSchema } from "../../../schemas/subdomains";
import { base, toORPCError } from "../../base";
import { publisher } from "../../publisher";

const ref = base
  .input(
    z.object({
      gitRef: z.string(),
      projectSubdomain: ProjectSubdomainSchema,
    }),
  )
  .output(GitRefInfoSchema)
  .handler(async ({ context, errors, input: { gitRef, projectSubdomain } }) => {
    const result = await getGitRefInfo(
      projectSubdomain,
      gitRef,
      context.workspaceConfig,
    );

    if (result.isErr()) {
      throw toORPCError(result.error, errors);
    }

    return result.value;
  });

const commitsList = base
  .input(
    z.object({
      limit: z.number().optional(),
      projectSubdomain: ProjectSubdomainSchema,
    }),
  )
  .output(GitCommitsSchema)
  .handler(async ({ context, errors, input: { limit, projectSubdomain } }) => {
    const result = await getGitCommits(
      projectSubdomain,
      context.workspaceConfig,
      limit,
    );

    if (result.isErr()) {
      throw toORPCError(result.error, errors);
    }

    return result.value;
  });

const commits = {
  list: commitsList,
  live: {
    list: base
      .input(
        z.object({
          limit: z.number().optional(),
          projectSubdomain: ProjectSubdomainSchema,
        }),
      )
      .output(eventIterator(GitCommitsSchema))
      .handler(async function* ({ context, input, signal }) {
        yield call(commitsList, input, { context, signal });

        // Technically this is a file-system watcher, but it's a good stand-in
        const partUpdates = publisher.subscribe("part.updated", {
          signal,
        });

        for await (const payload of partUpdates) {
          if (
            payload.subdomain === input.projectSubdomain &&
            payload.part.type === "data-gitCommit"
          ) {
            yield call(commitsList, input, { context, signal });
          }
        }
      }),
  },
};

export const projectGit = {
  commits,
  ref,
};
