const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

export const APPS_SERVER_API_PATH = "/_quests";
export const SHIM_IFRAME_BASE_PATH = `${APPS_SERVER_API_PATH}/shim-iframe`;
export const SHIM_SCRIPT_PATH = `${SHIM_IFRAME_BASE_PATH}/src/client/index.js`;
export const SHIM_DEV_HOST = "http://localhost:8150";
export const LOCAL_LOOPBACK_APPS_SERVER_DOMAIN = "quests.run"; // Due to some browsers not supporting localhost subdomains
export const LOCALHOST_APPS_SERVER_DOMAIN = "localhost";
export const APPS_SERVER_DOMAINS = [
  LOCAL_LOOPBACK_APPS_SERVER_DOMAIN,
  LOCALHOST_APPS_SERVER_DOMAIN,
];
export const DEFAULT_APPS_SERVER_PORT = IS_DEVELOPMENT ? 8100 : 9100;
export const DEFAULT_RUNTIME_BASE_PORT = IS_DEVELOPMENT ? 8200 : 9200;
export const SHIM_SCRIPTS = {
  iframeHTML: "index.html",
  iframeJS: "index.js",
  shimJS: "shim.js",
} as const;
export const FALLBACK_PAGE_META_NAME = "workspace-fallback-page";
