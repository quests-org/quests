import { err, ok } from "neverthrow";
import fs from "node:fs/promises";
import path from "node:path";
import { last, sift } from "radashi";
import { z } from "zod";

import { REGISTRY_TEMPLATES_FOLDER } from "../../constants";
import { absolutePathJoin } from "../../lib/absolute-path-join";
import { TypedError } from "../../lib/errors";
import {
  getRegistryTemplateDetails,
  RegistryTemplateDetailsSchema,
} from "../../lib/get-registry-template-details";
import {
  getRegistryTemplates,
  getRegistryTemplatesByName,
  RegistryTemplateSchema,
} from "../../lib/get-registry-templates";
import { type AbsolutePath } from "../../schemas/paths";
import { base, toORPCError } from "../base";

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
  .handler(async ({ context, errors }) => {
    const directoryData = await loadDirectoryData(
      context.workspaceConfig.registryDir,
    );

    if (directoryData.isErr()) {
      context.workspaceConfig.captureException(directoryData.error);
      throw toORPCError(directoryData.error, errors);
    }

    const apps = sift(
      directoryData.value.apps.map((app) => last(app.path.split("/"))),
    );

    return getRegistryTemplatesByName(apps, context.workspaceConfig);
  });

const listTemplates = base
  .output(z.array(RegistryTemplateSchema))
  .handler(async ({ context, errors }) => {
    const directoryData = await loadDirectoryData(
      context.workspaceConfig.registryDir,
    );

    if (directoryData.isErr()) {
      context.workspaceConfig.captureException(directoryData.error);
      throw toORPCError(directoryData.error, errors);
    }

    const templates = sift(
      directoryData.value.templates.map((template) =>
        last(template.path.split("/")),
      ),
    );

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

async function loadDirectoryData(registryDir: AbsolutePath) {
  const directoryPath = path.join(registryDir, "api", "directory.json");

  try {
    const content = await fs.readFile(directoryPath, "utf8");

    let json: unknown;
    try {
      json = JSON.parse(content);
    } catch (parseError) {
      return err(
        new TypedError.Parse(
          `Failed to parse directory.json at ${directoryPath}`,
          { cause: parseError },
        ),
      );
    }

    const parseResult = DirectoryAPISchema.safeParse(json);
    if (!parseResult.success) {
      return err(
        new TypedError.Parse(
          `Invalid schema in directory.json at ${directoryPath}: ${parseResult.error.message}`,
        ),
      );
    }

    return ok(parseResult.data);
  } catch (error) {
    return err(
      new TypedError.FileSystem(
        `Failed to read directory.json at ${directoryPath}`,
        { cause: error },
      ),
    );
  }
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
