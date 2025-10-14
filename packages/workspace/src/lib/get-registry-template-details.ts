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

export const RegistryTemplateDetailsSchema = z.object({
  description: QuestManifestSchema.shape.description.optional(),
  icon: QuestManifestSchema.shape.icon.optional(),
  preview: WorkspaceAppPreviewSchema,
  readme: z.string().optional(),
  screenshotPath: z.string().optional(),
  title: z.string(),
});

type RegistryTemplateDetails = z.output<typeof RegistryTemplateDetailsSchema>;

export async function getRegistryTemplateDetails(
  folderName: string,
  workspaceConfig: WorkspaceConfig,
): Promise<null | RegistryTemplateDetails> {
  const templatesDir = absolutePathJoin(
    workspaceConfig.registryDir,
    REGISTRY_TEMPLATES_FOLDER,
  );

  const templateDir = path.resolve(templatesDir, folderName);

  const templateDirExists = await fs
    .stat(templateDir)
    .then((stat) => stat.isDirectory())
    .catch(() => false);

  if (!templateDirExists) {
    return null;
  }

  // Validate the folder name
  const subdomainPart = SubdomainPartSchema.safeParse(folderName);
  if (!subdomainPart.success) {
    return null;
  }

  try {
    const parsedTemplateDir = AppDirSchema.parse(templateDir);
    const previewSubdomain = PreviewSubdomainSchema.parse(
      `${subdomainPart.data}.preview`,
    );

    // Read all metadata in parallel for better performance
    const [questsConfig, readme, screenshotPath] = await Promise.all([
      getQuestManifest(parsedTemplateDir),
      readTemplateReadme(parsedTemplateDir),
      findTemplateScreenshot(parsedTemplateDir),
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

async function findTemplateScreenshot(
  templateDir: string,
): Promise<string | undefined> {
  try {
    const screenshotFilePath = path.join(templateDir, "screenshot.png");
    await fs.access(screenshotFilePath);
    return screenshotFilePath;
  } catch {
    return undefined;
  }
}

async function readTemplateReadme(
  templateDir: string,
): Promise<string | undefined> {
  try {
    const readmePath = path.join(templateDir, "README.md");
    return await fs.readFile(readmePath, "utf8");
  } catch {
    return undefined;
  }
}
