import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { REGISTRY_TEMPLATES_FOLDER } from "../constants";
import { WorkspaceAppPreviewSchema } from "../schemas/app";
import { AppDirSchema } from "../schemas/paths";
import { QuestManifestSchema } from "../schemas/quest-manifest";
import { SubdomainPartSchema } from "../schemas/subdomain-part";
import { PreviewSubdomainSchema } from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";
import { absolutePathJoin } from "./absolute-path-join";
import { getWorkspaceAppForSubdomain } from "./get-workspace-app-for-subdomain";
import { getQuestManifest } from "./quest-manifest";

export const RegistryAppDetailsSchema = z.object({
  description: QuestManifestSchema.shape.description.optional(),
  icon: QuestManifestSchema.shape.icon.optional(),
  preview: WorkspaceAppPreviewSchema,
  readme: z.string().optional(),
  screenshotPath: z.string().optional(),
  title: z.string(),
});

type RegistryAppDetails = z.output<typeof RegistryAppDetailsSchema>;

export async function getRegistryAppDetails(
  folderName: string,
  workspaceConfig: WorkspaceConfig,
): Promise<null | RegistryAppDetails> {
  const appsDir = absolutePathJoin(
    workspaceConfig.registryDir,
    REGISTRY_TEMPLATES_FOLDER,
  );

  const appDir = path.resolve(appsDir, folderName);

  // Check if the app directory exists
  const appDirExists = await fs
    .stat(appDir)
    .then((stat) => stat.isDirectory())
    .catch(() => false);

  if (!appDirExists) {
    return null;
  }

  // Validate the folder name
  const subdomainPart = SubdomainPartSchema.safeParse(folderName);
  if (!subdomainPart.success) {
    return null;
  }

  try {
    const parsedAppDir = AppDirSchema.parse(appDir);
    const previewSubdomain = PreviewSubdomainSchema.parse(
      `${subdomainPart.data}.preview`,
    );

    // Read all metadata in parallel for better performance
    const [questsConfig, readme, screenshotPath] = await Promise.all([
      getQuestManifest(parsedAppDir),
      readAppReadme(parsedAppDir),
      findAppScreenshot(parsedAppDir),
    ]);

    const title = questsConfig?.name ?? folderName;
    const description = questsConfig?.description;

    const preview = await getWorkspaceAppForSubdomain(
      previewSubdomain,
      workspaceConfig,
    );

    return {
      description,
      icon: questsConfig?.icon,
      preview,
      readme,
      screenshotPath,
      title,
    };
  } catch {
    // Log error silently and return null for failed registry app details
    return null;
  }
}

async function findAppScreenshot(appDir: string): Promise<string | undefined> {
  try {
    const screenshotFilePath = path.join(appDir, "screenshot.png");
    await fs.access(screenshotFilePath);
    return screenshotFilePath;
  } catch {
    return undefined;
  }
}

async function readAppReadme(appDir: string): Promise<string | undefined> {
  try {
    const readmePath = path.join(appDir, "README.md");
    return await fs.readFile(readmePath, "utf8");
  } catch {
    return undefined;
  }
}
