import { getSessionStore } from "@/electron-main/stores/session";

export function getToken() {
  return getSessionStore().get("apiBearerToken");
}

export function hasToken() {
  return !!getSessionStore().get("apiBearerToken");
}
