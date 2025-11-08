import { getSessionStore } from "@/electron-main/stores/session";

export function getToken() {
  return getSessionStore().get("apiBearerToken");
}

export function hasToken() {
  return !!getSessionStore().get("apiBearerToken");
}

export function isNetworkConnectionError(error: Error | null) {
  return (
    error && error instanceof TypeError && error.cause instanceof AggregateError
  );
}
