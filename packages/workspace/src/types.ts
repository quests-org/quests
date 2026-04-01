import { type GetProviderConfigs } from "@quests/ai-gateway";
import {
  type CaptureEventFunction,
  type CaptureExceptionFunction,
} from "@quests/shared";

import { type APP_STATUSES } from "./constants";
import { type AbsolutePath, type WorkspaceDir } from "./schemas/paths";
import { type ProjectSubdomain } from "./schemas/subdomains";

export type AppStatus = (typeof APP_STATUSES)[number];

export interface BrowserConfig {
  closeTarget: (targetId: string) => Promise<void>;
  createTarget: (subdomain: ProjectSubdomain) => Promise<{ targetId: string }>;
  listTargets: (subdomain: ProjectSubdomain) => Promise<BrowserTarget[]>;
  sendCommand: (
    targetId: string,
    method: string,
    params: unknown,
  ) => Promise<unknown>;
  subscribeEvents: (
    targetId: string,
    onDetach: () => void,
    onEvent: (method: string, params: unknown) => void,
  ) => () => void;
}

export interface BrowserTarget {
  id: string;
  title: string;
  type: "page";
  url: string;
}

export interface WorkspaceConfig {
  browser: BrowserConfig;
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
  templatesDir: AbsolutePath;
  trashItem: (path: AbsolutePath) => Promise<void>;
}
