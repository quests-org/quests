import {
  AIGatewayModelURI,
  type AIGatewayProviderConfig,
  migrateModelURI,
} from "@quests/ai-gateway";
import fs from "node:fs/promises";
import { z } from "zod";

import { AgentNameSchema } from "../agents/types";
import { type AbsolutePath, type AppDir } from "../schemas/paths";
import { absolutePathJoin } from "./absolute-path-join";
import { getAppPrivateDir } from "./app-dir-utils";

const PROJECT_STATE_FILE_NAME = "project-state.json";

const StoredProjectStateSchema = z
  // Relaxed schema for backwards compatibility
  .object({
    promptDraft: z.string().optional(),
    selectedAgentName: AgentNameSchema.optional().default("app-builder"),
    selectedModelURI: z.string().optional(),
  })
  .default({ selectedAgentName: "app-builder" });

export const ProjectStateSchema = z.object({
  promptDraft: z.string().optional(),
  selectedAgentName: AgentNameSchema.optional().default("app-builder"),
  selectedModelURI: AIGatewayModelURI.Schema.optional(),
});

type ProjectState = z.output<typeof StoredProjectStateSchema>;

export async function getMigratedProjectState({
  appDir,
  captureException,
  configs,
}: {
  appDir: AppDir;
  captureException: (error: Error) => void;
  configs: AIGatewayProviderConfig.Type[];
}): Promise<z.output<typeof ProjectStateSchema>> {
  const { selectedModelURI, ...rest } = await getProjectState(appDir);

  if (!selectedModelURI) {
    return rest;
  }

  const [migratedURI, error] = migrateModelURI({
    configs,
    modelURI: selectedModelURI,
  }).toTuple();

  if (error) {
    if (error.type !== "gateway-not-found-error") {
      // Ignoring not found errors, because that just means they don't have
      // that provider anymore.
      captureException(error);
    }
    return rest;
  }

  return {
    ...rest,
    selectedModelURI: migratedURI,
  };
}

export async function getProjectState(appDir: AppDir): Promise<ProjectState> {
  const stateFilePath = getProjectStateFilePath(appDir);

  try {
    const content = await fs.readFile(stateFilePath, "utf8");
    const rawState = JSON.parse(content) as unknown;
    return StoredProjectStateSchema.parse(rawState);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return StoredProjectStateSchema.parse({});
    }
    return StoredProjectStateSchema.parse({});
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

  const newState = StoredProjectStateSchema.parse({
    ...currentState,
    ...state,
  });

  await fs.writeFile(stateFilePath, JSON.stringify(newState, null, 2), "utf8");
}

function getProjectStateFilePath(appDir: AppDir): AbsolutePath {
  return absolutePathJoin(getAppPrivateDir(appDir), PROJECT_STATE_FILE_NAME);
}
