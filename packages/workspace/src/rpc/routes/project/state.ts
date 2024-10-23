import { z } from "zod";

import { createAppConfig } from "../../../lib/app-config/create";
import {
  getProjectState,
  ProjectStateSchema,
} from "../../../lib/project-state-store";
import { ProjectSubdomainSchema } from "../../../schemas/subdomains";
import { base, toORPCError } from "../../base";

const get = base
  .input(z.object({ subdomain: ProjectSubdomainSchema }))
  .output(ProjectStateSchema)
  .handler(async ({ context, errors, input }) => {
    try {
      const appConfig = createAppConfig({
        subdomain: input.subdomain,
        workspaceConfig: context.workspaceConfig,
      });

      return await getProjectState(appConfig.appDir);
    } catch (error) {
      throw toORPCError(
        {
          message: error instanceof Error ? error.message : "Unknown error",
          type: "unknown" as const,
        },
        errors,
      );
    }
  });

export const projectState = {
  get,
};
