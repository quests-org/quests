import { type GetProviderConfigs } from "@quests/ai-gateway";
import {
  type CaptureEventFunction,
  type CaptureExceptionFunction,
} from "@quests/shared";

import { type APP_STATUSES } from "./constants";
import { type AbsolutePath, type WorkspaceDir } from "./schemas/paths";

export type AppStatus = (typeof APP_STATUSES)[number];

export interface WorkspaceConfig {
  captureEvent: CaptureEventFunction;
  captureException: CaptureExceptionFunction;
  getAIProviderConfigs: GetProviderConfigs;
  nodeExecEnv: Record<string, string>;
  pnpmBinPath: AbsolutePath;
  previewCacheTimeMs?: number;
  previewsDir: AbsolutePath;
  projectsDir: AbsolutePath;
  registryDir: AbsolutePath;
  rootDir: WorkspaceDir;
  trashItem: (path: AbsolutePath) => Promise<void>;
}
