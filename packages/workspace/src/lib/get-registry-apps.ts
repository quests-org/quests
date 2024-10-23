import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { REGISTRY_APPS_FOLDER } from "../constants";
import { AppDirSchema } from "../schemas/paths";
import { SubdomainPartSchema } from "../schemas/subdomain-part";
import { type WorkspaceConfig } from "../types";
import { absolutePathJoin } from "./absolute-path-join";

export const RegistryAppSchema = z.object({
  appDir: AppDirSchema,
  folderName: z.string(),
  previewSubdomain: z.string(),
});

type RegistryApp = z.output<typeof RegistryAppSchema>;

export async function getRegistryApps(
  workspaceConfig: WorkspaceConfig,
): Promise<RegistryApp[]> {
  // First check if the templates dir exists
  const appsDir = absolutePathJoin(
    workspaceConfig.registryDir,
    REGISTRY_APPS_FOLDER,
  );
  const appsDirExists = await fs
    .stat(appsDir)
    .then(() => true)
    .catch(() => false);
  if (!appsDirExists) {
    return [];
  }

  try {
    const entries = await fs.readdir(appsDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => {
        const appDir = AppDirSchema.parse(path.resolve(appsDir, entry.name));
        return RegistryAppSchema.parse({
          appDir,
          folderName: entry.name,
          previewSubdomain: `preview-${SubdomainPartSchema.parse(entry.name)}`,
        });
      });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error reading templates folder", error);
    return [];
  }
}
