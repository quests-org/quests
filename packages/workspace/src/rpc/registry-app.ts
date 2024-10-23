import fs from "node:fs/promises";
import { z } from "zod";

import {
  getRegistryAppDetails,
  RegistryAppDetailsSchema,
} from "../lib/get-registry-app-details";
import { getRegistryApps, RegistryAppSchema } from "../lib/get-registry-apps";
import { base } from "./base";

const byFolderName = base
  .input(z.object({ folderName: z.string() }))
  .output(RegistryAppDetailsSchema)
  .handler(async ({ context, errors, input }) => {
    const result = await getRegistryAppDetails(
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
  .output(z.array(RegistryAppSchema))
  .handler(async ({ context }) => {
    return getRegistryApps(context.workspaceConfig);
  });

const screenshot = base
  .input(z.object({ folderName: z.string() }))
  .output(z.string().nullable())
  .handler(async ({ context, input }) => {
    const appDetails = await getRegistryAppDetails(
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

export const registryApp = {
  byFolderName,
  list,
  screenshot,
};
