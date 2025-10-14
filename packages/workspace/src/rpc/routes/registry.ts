import fs from "node:fs/promises";
import { z } from "zod";

import {
  getRegistryTemplateDetails,
  RegistryTemplateDetailsSchema,
} from "../../lib/get-registry-template-details";
import {
  getRegistryTemplates,
  RegistryTemplateSchema,
} from "../../lib/get-registry-templates";
import { base } from "../base";

const byFolderName = base
  .input(z.object({ folderName: z.string() }))
  .output(RegistryTemplateDetailsSchema)
  .handler(async ({ context, errors, input }) => {
    const result = await getRegistryTemplateDetails(
      input.folderName,
      context.workspaceConfig,
    );
    if (!result) {
      throw errors.NOT_FOUND({
        message: `Registry app ${input.folderName} not found`,
      });
    }

    return result;
  });

const list = base
  .output(z.array(RegistryTemplateSchema))
  .handler(async ({ context }) => {
    return getRegistryTemplates(context.workspaceConfig);
  });

const screenshot = base
  .input(z.object({ folderName: z.string() }))
  .output(z.string().nullable())
  .handler(async ({ context, input }) => {
    const appDetails = await getRegistryTemplateDetails(
      input.folderName,
      context.workspaceConfig,
    );

    if (!appDetails?.screenshotPath) {
      return null;
    }

    try {
      const fileBuffer = await fs.readFile(appDetails.screenshotPath);
      const base64 = fileBuffer.toString("base64");
      return `data:image/png;base64,${base64}`;
    } catch {
      return null;
    }
  });

export const registry = {
  template: {
    byFolderName,
    list,
    screenshot,
  },
};
