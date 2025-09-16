import { z } from "zod";

import { createAppConfig } from "../../../lib/app-config/create";
import {
  getProjectState,
  ProjectStateSchema,
} from "../../../lib/project-state-store";
import { ProjectSubdomainSchema } from "../../../schemas/subdomains";
import { base } from "../../base";

const get = base
  .input(z.object({ subdomain: ProjectSubdomainSchema }))
  .output(ProjectStateSchema)
  .handler(async ({ context, input }) => {
    const appConfig = createAppConfig({
      subdomain: input.subdomain,
      workspaceConfig: context.workspaceConfig,
    });

    return getProjectState(appConfig.appDir);
  });

export const projectState = {
  get,
};
