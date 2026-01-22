import { PROJECT_MANIFEST_FILE_NAME } from "@quests/shared";
import { err, ok, ResultAsync, safeTry } from "neverthrow";
import fs from "node:fs/promises";

import { publisher } from "../rpc/publisher";
import { type AppDir } from "../schemas/paths";
import {
  type ProjectManifest,
  ProjectManifestSchema,
  type ProjectManifestUpdate,
  ProjectManifestUpdateSchema,
} from "../schemas/project-manifest";
import { absolutePathJoin } from "./absolute-path-join";
import { type AppConfigProject } from "./app-config/types";
import { TypedError } from "./errors";

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

export function updateProjectManifest(
  projectConfig: AppConfigProject,
  updates: ProjectManifestUpdate,
) {
  return safeTry(async function* () {
    const parseResult = ProjectManifestUpdateSchema.safeParse(updates);
    if (!parseResult.success) {
      return err(
        new TypedError.Parse(
          `Invalid project manifest updates: ${parseResult.error.message}`,
          { cause: parseResult.error },
        ),
      );
    }

    const validatedUpdates = parseResult.data;

    const projectManifestPath = absolutePathJoin(
      projectConfig.appDir,
      PROJECT_MANIFEST_FILE_NAME,
    );

    let existing: ProjectManifest = { name: "" };

    try {
      existing = (await getProjectManifest(projectConfig.appDir)) ?? {
        name: "",
      };
    } catch {
      // File doesn't exist or is invalid, use default manifest
    }

    yield* ResultAsync.fromPromise(
      fs.writeFile(
        projectManifestPath,
        JSON.stringify(
          {
            ...existing,
            ...validatedUpdates,
          },
          null,
          2,
        ),
      ),
      (error) =>
        new TypedError.FileSystem(
          `Failed to write project manifest: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        ),
    );

    publisher.publish("project.updated", {
      subdomain: projectConfig.subdomain,
    });

    return ok(undefined);
  });
}
