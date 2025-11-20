import { z } from "zod";

import { MAX_PROMPT_STORAGE_LENGTH } from "../../../constants";
import { createAppConfig } from "../../../lib/app-config/create";
import {
  getMigratedProjectState,
  ProjectStateSchema,
  setProjectState,
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

    return getMigratedProjectState({
      appDir: appConfig.appDir,
      captureException: context.workspaceConfig.captureException,
      configs: context.workspaceConfig.getAIProviderConfigs(),
    });
  });

const set = base
  .input(
    z.object({
      state: ProjectStateSchema.partial(),
      subdomain: ProjectSubdomainSchema,
    }),
  )
  .output(z.void())
  .handler(async ({ context, input }) => {
    const appConfig = createAppConfig({
      subdomain: input.subdomain,
      workspaceConfig: context.workspaceConfig,
    });

    const stateToSave = { ...input.state };

    if (
      stateToSave.promptDraft &&
      stateToSave.promptDraft.length > MAX_PROMPT_STORAGE_LENGTH
    ) {
      delete stateToSave.promptDraft;
    }

    await setProjectState(appConfig.appDir, stateToSave);
  });

export const projectState = {
  get,
  set,
};
