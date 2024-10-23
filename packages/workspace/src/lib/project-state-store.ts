import { AIGatewayModel } from "@quests/ai-gateway";
import fs from "node:fs/promises";
import { z } from "zod";

import { type AbsolutePath, type AppDir } from "../schemas/paths";
import { absolutePathJoin } from "./absolute-path-join";
import { getAppPrivateDir } from "./app-dir-utils";

const PROJECT_STATE_FILE_NAME = "project-state.json";

export const ProjectStateSchema = z
  .object({
    selectedModelURI: AIGatewayModel.URISchema.optional(),
  })
  .default({});

type ProjectState = z.output<typeof ProjectStateSchema>;

export async function getProjectState(appDir: AppDir): Promise<ProjectState> {
  const stateFilePath = getProjectStateFilePath(appDir);

  try {
    const content = await fs.readFile(stateFilePath, "utf8");
    const rawState = JSON.parse(content) as unknown;
    return ProjectStateSchema.parse(rawState);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return ProjectStateSchema.parse({});
    }
    return ProjectStateSchema.parse({});
  }
}

export async function setProjectState(
  appDir: AppDir,
  state: Partial<ProjectState>,
): Promise<void> {
  const stateFilePath = getProjectStateFilePath(appDir);
  const privateDir = getAppPrivateDir(appDir);

  await fs.mkdir(privateDir, { recursive: true });

  const currentState = await getProjectState(appDir);

  const newState = ProjectStateSchema.parse({
    ...currentState,
    ...state,
  });

  await fs.writeFile(stateFilePath, JSON.stringify(newState, null, 2), "utf8");
}

function getProjectStateFilePath(appDir: AppDir): AbsolutePath {
  return absolutePathJoin(getAppPrivateDir(appDir), PROJECT_STATE_FILE_NAME);
}
