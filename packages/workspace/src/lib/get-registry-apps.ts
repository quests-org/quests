import fs from "node:fs/promises";
import { z } from "zod";

import { REGISTRY_APPS_FOLDER } from "../constants";
import { AppDirSchema } from "../schemas/paths";
import { SubdomainPartSchema } from "../schemas/subdomain-part";
import {
  PREVIEW_SUBDOMAIN_PART,
  PreviewSubdomainSchema,
} from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";
import { absolutePathJoin } from "./absolute-path-join";
import { pathExists } from "./path-exists";

export const RegistryAppSchema = z.object({
  appDir: AppDirSchema,
  folderName: z.string(),
  previewSubdomain: PreviewSubdomainSchema,
});

type RegistryApp = z.output<typeof RegistryAppSchema>;

export async function getRegistryApps(
  workspaceConfig: WorkspaceConfig,
): Promise<RegistryApp[]> {
  const registryAppsDir = absolutePathJoin(
    workspaceConfig.registryDir,
    REGISTRY_APPS_FOLDER,
  );

  if (!(await pathExists(registryAppsDir))) {
    return [];
  }

  try {
    const entries = await fs.readdir(registryAppsDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => {
        const appDir = absolutePathJoin(registryAppsDir, entry.name);
        return RegistryAppSchema.parse({
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
