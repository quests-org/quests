import fs from "node:fs/promises";
import { z } from "zod";

import { AppDirSchema } from "../schemas/paths";
import { SubdomainPartSchema } from "../schemas/subdomain-part";
import {
  PREVIEW_SUBDOMAIN_PART,
  PreviewSubdomainSchema,
} from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";
import { absolutePathJoin } from "./absolute-path-join";
import { pathExists } from "./path-exists";

const EMPTY_TEMPLATE = "empty";

export const RegistryTemplateSchema = z.object({
  appDir: AppDirSchema,
  folderName: z.string(),
  previewSubdomain: PreviewSubdomainSchema,
});

type RegistryTemplate = z.output<typeof RegistryTemplateSchema>;

export async function getRegistryTemplates(
  workspaceConfig: WorkspaceConfig,
): Promise<RegistryTemplate[]> {
  return getRegistryTemplatesImpl(workspaceConfig);
}

export async function getRegistryTemplatesByName(
  folderNames: string[],
  workspaceConfig: WorkspaceConfig,
): Promise<RegistryTemplate[]> {
  return getRegistryTemplatesImpl(workspaceConfig, folderNames);
}

async function getRegistryTemplatesImpl(
  workspaceConfig: WorkspaceConfig,
  folderNames?: string[],
): Promise<RegistryTemplate[]> {
  const registryTemplatesDir = workspaceConfig.templatesDir;

  if (!(await pathExists(registryTemplatesDir))) {
    return [];
  }

  try {
    const entries = await fs.readdir(registryTemplatesDir, {
      withFileTypes: true,
    });

    if (folderNames) {
      return folderNames
        .filter((folderName) => {
          const entry = entries.find(
            (e) =>
              e.isDirectory() &&
              e.name === folderName &&
              !e.name.startsWith(".") &&
              e.name !== EMPTY_TEMPLATE,
          );
          return entry !== undefined;
        })
        .map((folderName) => {
          const appDir = absolutePathJoin(registryTemplatesDir, folderName);
          return RegistryTemplateSchema.parse({
            appDir,
            folderName,
            previewSubdomain: `${SubdomainPartSchema.parse(folderName)}.${PREVIEW_SUBDOMAIN_PART}`,
          });
        });
    }

    // If no folderNames provided, use the original logic
    return entries
      .filter(
        (entry) =>
          entry.isDirectory() &&
          !entry.name.startsWith(".") &&
          entry.name !== EMPTY_TEMPLATE,
      )
      .map((entry) => {
        const appDir = absolutePathJoin(registryTemplatesDir, entry.name);
        return RegistryTemplateSchema.parse({
          appDir,
          folderName: entry.name,
          previewSubdomain: `${SubdomainPartSchema.parse(entry.name)}.${PREVIEW_SUBDOMAIN_PART}`,
        });
      });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error reading registry apps folder", error);
    return [];
  }
}
