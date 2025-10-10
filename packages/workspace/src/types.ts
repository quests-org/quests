import { type GetAIProviders } from "@quests/ai-gateway";
import {
  type CaptureEventFunction,
  type CaptureExceptionFunction,
} from "@quests/shared";

import { type APP_STATUSES } from "./constants";
import { type AbsolutePath, type WorkspaceDir } from "./schemas/paths";
import { type RunShellCommand, type ShellResult } from "./tools/types";

export type AppStatus = (typeof APP_STATUSES)[number];

export type RunPackageJsonScript = (options: {
  cwd: string;
  script: string;
  scriptOptions: {
    env: Record<string, string>;
    port: number;
  };
  signal: AbortSignal;
}) => Promise<ShellResult> | ShellResult;

export interface WorkspaceConfig {
  binDir: AbsolutePath;
  captureEvent: CaptureEventFunction;
  captureException: CaptureExceptionFunction;
  getAIProviders: GetAIProviders;
  previewCacheTimeMs?: number;
  previewsDir: AbsolutePath;
  projectsDir: AbsolutePath;
  registryDir: AbsolutePath;
  rootDir: WorkspaceDir;
  runShellCommand: RunShellCommand;
  trashItem: (path: AbsolutePath) => Promise<void>;
}
