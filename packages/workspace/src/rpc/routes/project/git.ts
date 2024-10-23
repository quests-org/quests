import { z } from "zod";

import { getGitRefInfo, GitRefInfoSchema } from "../../../lib/get-git-ref-info";
import { ProjectSubdomainSchema } from "../../../schemas/subdomains";
import { base, toORPCError } from "../../base";

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

export const projectGit = {
  ref,
};
