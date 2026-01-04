import { type ProjectMode } from "@quests/shared";

export const APP_FOLDER_NAMES = {
  output: "output",
  private: ".quests",
  src: "src",
  uploads: "uploads",
} as const;
export const SESSIONS_DB_FILE_NAME = "sessions.db";
export const PROJECT_SUBDOMAIN_MODE_PREFIXES: Record<ProjectMode, string> = {
  "app-builder": "",
  chat: "chat",
  eval: "eval",
};

export const APP_STATUSES = [
  "error",
  "loading",
  "not-found",
  "ready",
  "stopped",
  "not-runnable",
  "unknown",
] as const;

export const GIT_AUTHOR = { email: "agent@quests.dev", name: "Quests Agent" };
export const GIT_TRAILERS = {
  initialCommit: "Quests-Initial-Commit",
  template: "Quests-Template",
};
export const WEBSITE_URL = "https://quests.dev";
export const APP_NAME = "Quests";

// Limit prompt storage to 50KB to avoid blowing up the JSON file
export const MAX_PROMPT_STORAGE_LENGTH = 50_000;
