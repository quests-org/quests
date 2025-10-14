import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { REGISTRY_TEMPLATES_FOLDER } from "../../constants";
import { absolutePathJoin } from "../../lib/absolute-path-join";
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

const PackageJsonSchema = z.object({
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
});

const packageJson = base
  .input(z.object({ folderName: z.string() }))
  .output(PackageJsonSchema.nullable())
  .handler(async ({ context, input }) => {
    const templatesDir = absolutePathJoin(
      context.workspaceConfig.registryDir,
      REGISTRY_TEMPLATES_FOLDER,
    );

    const packageJsonPath = path.join(
      templatesDir,
      input.folderName,
      "package.json",
    );

    try {
      const content = await fs.readFile(packageJsonPath, "utf8");
      const parsed = JSON.parse(content) as unknown;
      return PackageJsonSchema.parse(parsed);
    } catch {
      return null;
    }
  });

export const registry = {
  template: {
    byFolderName,
    list,
    packageJson,
    screenshot,
  },
};
