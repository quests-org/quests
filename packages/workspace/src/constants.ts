export const REGISTRY_FOLDER_NAMES = {
  skills: "skills",
  templates: "templates",
} as const;

export const APP_FOLDER_NAMES = {
  agentRetrieved: "agent-retrieved",
  output: "output",
  private: ".quests",
  scripts: "scripts",
  src: "src",
  userProvided: "user-provided",
} as const;
export const SESSIONS_DB_FILE_NAME = "sessions.db";
// TODO: Remove chat- after 2026-03-01
export const LEGACY_PROJECT_SUBDOMAIN_MODE_PREFIXES = {
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

// Limit prompt storage to 50KB to avoid blowing up the JSON file
export const MAX_PROMPT_STORAGE_LENGTH = 50_000;
