import { type ProjectMode } from "@quests/shared";

export const APP_PRIVATE_FOLDER = ".quests";
export const QUEST_MANIFEST_FILE_NAME = "quests.json";
export const WORKSPACE_FOLDER = "workspace";
export const PREVIEWS_FOLDER = "previews";
export const PROJECTS_FOLDER = "projects";
export const SANDBOXES_FOLDER = "sandboxes";
export const REGISTRY_TEMPLATES_FOLDER = "templates";
export const SESSIONS_DB_FILE_NAME = "sessions.db";
export const SESSIONS_TABLE_NAME = "sessions";
export const DEFAULT_TEMPLATE_NAME = "basic";
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
export const WEBSITE_URL = "https://quests.dev";
export const APP_NAME = "Quests";
