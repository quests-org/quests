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
  getRegistryTemplatesByName,
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

const listAll = base
  .output(z.array(RegistryTemplateSchema))
  .handler(async ({ context }) => {
    return getRegistryTemplates(context.workspaceConfig);
  });

const listApps = base
  .output(z.array(RegistryTemplateSchema))
  .handler(async ({ context }) => {
    const directoryData = await loadDirectoryData(
      context.workspaceConfig.registryDir,
    );
    const apps = directoryData.data?.apps
      .map((app) => app.path.split("/").pop())
      .filter((app) => app !== undefined);

    if (!apps) {
      return [];
    }

    return getRegistryTemplatesByName(apps, context.workspaceConfig);
  });

const listTemplates = base
  .output(z.array(RegistryTemplateSchema))
  .handler(async ({ context }) => {
    const directoryData = await loadDirectoryData(
      context.workspaceConfig.registryDir,
    );
    const templates = directoryData.data?.templates
      .map((template) => template.path.split("/").pop())
      .filter((template) => template !== undefined);

    if (!templates) {
      return [];
    }

    return getRegistryTemplatesByName(templates, context.workspaceConfig);
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

const DirectoryAPITemplateSchema = z.object({
  path: z.string(),
});

const DirectoryAPISchema = z.object({
  apps: z.array(DirectoryAPITemplateSchema),
  templates: z.array(DirectoryAPITemplateSchema),
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

async function loadDirectoryData(registryDir: string) {
  const directoryPath = path.join(registryDir, "api", "directory.json");
  const content = await fs.readFile(directoryPath, "utf8");
  const json = JSON.parse(content) as unknown;
  return DirectoryAPISchema.safeParse(json);
}

export const registry = {
  template: {
    byFolderName,
    listAll,
    listApps,
    listTemplates,
    packageJson,
    screenshot,
  },
};
