import { z } from "zod";

import { restoreVersion as restoreVersionFn } from "../../../lib/restore-version";
import { StoreId } from "../../../schemas/store-id";
import { ProjectSubdomainSchema } from "../../../schemas/subdomains";
import { base, toORPCError } from "../../base";

const localBase = base.errors({
  NO_CHANGES: {},
  VERSION_NOT_FOUND: {},
});

const restore = localBase
  .input(
    z.object({
      gitRef: z.string(),
      projectSubdomain: ProjectSubdomainSchema,
      sessionId: StoreId.SessionSchema,
    }),
  )
  .output(
    z.object({
      restoreCommitRef: z.string(),
      restoredToRef: z.string(),
      sessionId: StoreId.SessionSchema,
      success: z.boolean(),
    }),
  )
  .handler(
    async ({
      context,
      errors,
      input: { gitRef, projectSubdomain, sessionId },
    }) => {
      const result = await restoreVersionFn({
        gitRef,
        projectSubdomain,
        sessionId,
        workspaceConfig: context.workspaceConfig,
      });

      if (result.isErr()) {
        switch (result.error.type) {
          case "workspace-no-changes-error": {
            throw errors.NO_CHANGES({ message: result.error.message });
          }
          case "workspace-not-found-error": {
            throw errors.VERSION_NOT_FOUND({ message: result.error.message });
          }
        }
        context.workspaceConfig.captureException(result.error);
        throw toORPCError(result.error, errors);
      }

      context.workspaceRef.send({
        type: "restartRuntime",
        value: { subdomain: projectSubdomain },
      });

      context.workspaceConfig.captureEvent("project.restored_version");

      return result.value;
    },
  );

export const projectVersion = {
  restore,
};
