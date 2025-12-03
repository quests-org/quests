export const AI_GATEWAY_API_PATH = "/ai-gateway";

// TODO: remove need for vite env in this package
// This package is sometimes used outside the Vite environment
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
export const APP_PROTOCOL = import.meta?.env?.VITE_APP_PROTOCOL
  ? import.meta.env.VITE_APP_PROTOCOL
  : "quests";

export const APP_REPO_NAME = "quests";
export const GITHUB_ORG = "quests-org";
export const APP_REPO_URL = `https://github.com/${GITHUB_ORG}/${APP_REPO_NAME}`;
export const ATTRIBUTION_NAME = "Quests.dev";
export const ATTRIBUTION_URL = "https://quests.dev";
export const BASE_WEB_URL = "https://quests.dev";
export const FAUX_STUDIO_URL = "https://studio.quests.dev";
export const NEW_ISSUE_URL = `${APP_REPO_URL}/issues/new/choose`;
export const PRODUCT_NAME = "Quests";
export const REGISTRY_REPO_NAME = "registry";
export const REGISTRY_REPO_URL = `https://github.com/${GITHUB_ORG}/${REGISTRY_REPO_NAME}`;
export const RELEASE_NOTES_URL = `${APP_REPO_URL}/releases`;
export const X_HANDLE = "@quests_dev";
export const X_URL = "https://x.com/quests_dev";
export const DISCORD_URL = "https://quests.dev/discord";
export const AI_GATEWAY_API_KEY_NOT_NEEDED = "NOT_NEEDED";
export const SALES_EMAIL = "hello@quests.dev";
export const SUPPORT_EMAIL = "support@quests.dev";
