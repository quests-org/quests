export const API_AUTH_BASE_URL = import.meta.env.VITE_QUESTS_API_BASE_URL
  ? `${import.meta.env.VITE_QUESTS_API_BASE_URL}/auth`
  : undefined;
export const API_RPC_BASE_URL = import.meta.env.VITE_QUESTS_API_BASE_URL
  ? `${import.meta.env.VITE_QUESTS_API_BASE_URL}/rpc`
  : "";
