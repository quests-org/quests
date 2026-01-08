import { PROJECT_MANIFEST_FILE_NAME } from "@quests/shared";
import fs from "node:fs/promises";

import { publisher } from "../rpc/publisher";
import { type AppDir } from "../schemas/paths";
import {
  type ProjectManifest,
  ProjectManifestSchema,
} from "../schemas/project-manifest";
import { absolutePathJoin } from "./absolute-path-join";
import { type AppConfigProject } from "./app-config/types";

export async function getProjectManifest(
  appDir: AppDir,
): Promise<ProjectManifest | undefined> {
  const projectManifestPath = absolutePathJoin(
    appDir,
    PROJECT_MANIFEST_FILE_NAME,
  );

  try {
    const manifestContent = await fs.readFile(projectManifestPath, "utf8");
    const parsed = ProjectManifestSchema.safeParse(JSON.parse(manifestContent));
    if (!parsed.success) {
      return undefined;
    }
    return parsed.data;
  } catch {
    return undefined;
  }
}

export async function updateProjectManifest(
  projectConfig: AppConfigProject,
  updates: Partial<ProjectManifest>,
): Promise<void> {
  const projectManifestPath = absolutePathJoin(
    projectConfig.appDir,
    PROJECT_MANIFEST_FILE_NAME,
  );

  let existing: ProjectManifest = { name: "" };

  try {
    existing = (await getProjectManifest(projectConfig.appDir)) ?? { name: "" };
  } catch {
    // File doesn't exist or is invalid, use default manifest
  }

  await fs.writeFile(
    projectManifestPath,
    JSON.stringify(
      {
        ...existing,
        ...updates,
      },
      null,
      2,
    ),
  );

  publisher.publish("project.updated", {
    subdomain: projectConfig.subdomain,
  });
}
