import { onSignOut } from "@/electron-main/api/client";
import { API_AUTH_BASE_URL } from "@/electron-main/api/constants";
import { getAuthServerPort } from "@/electron-main/auth/state";
import { publisher } from "@/electron-main/rpc/publisher";
import { getSessionStore } from "@/electron-main/stores/session";
import * as arctic from "arctic";
import { createAuthClient } from "better-auth/client";
import { shell } from "electron";

import { captureServerException } from "../lib/capture-server-exception";

export const auth = createAuthClient({
  baseURL: API_AUTH_BASE_URL,
});

export const store: {
  codeVerifier: null | string;
  inviteCode: null | string;
  state: null | string;
} = {
  codeVerifier: null,
  inviteCode: null,
  state: null,
};

interface OAuthState {
  inviteCode?: string;
  state: string;
}

export function createGoogleProvider({ port }: { port: number }) {
  return new arctic.Google(
    import.meta.env.MAIN_VITE_GOOGLE_CLIENT_ID ?? "invalid-client-id",
    import.meta.env.MAIN_VITE_GOOGLE_CLIENT_SECRET ?? "invalid-client-secret",
    `http://localhost:${port}/auth/callback/google`,
  );
}

export function decodeOAuthState(encodedState: string): null | OAuthState {
  try {
    const decoded = Buffer.from(encodedState, "base64").toString("utf8");
    return JSON.parse(decoded) as OAuthState;
  } catch (error) {
    captureServerException(
      new Error("Failed to decode OAuth state", { cause: error }),
      { scopes: ["rpc", "auth"] },
    );
    return null;
  }
}

export async function signInSocial(inviteCode?: string) {
  const authServerPort = getAuthServerPort();
  if (authServerPort === null) {
    throw new Error("Auth server port is not set");
  }

  const google = createGoogleProvider({ port: authServerPort });

  const baseState = arctic.generateState();

  const stateData = {
    state: baseState,
    ...(inviteCode && { inviteCode }),
  };

  const encodedState = Buffer.from(JSON.stringify(stateData)).toString(
    "base64",
  );

  store.state = encodedState;
  store.codeVerifier = arctic.generateCodeVerifier();
  store.inviteCode = inviteCode || null;

  const scopes = ["email", "profile", "openid"];
  const url = google.createAuthorizationURL(
    encodedState,
    store.codeVerifier,
    scopes,
  );
  await shell.openExternal(url.toString());
}

export async function signOut() {
  const response = await auth.signOut({});
  const sessionStore = getSessionStore();
  sessionStore.set("apiBearerToken", null);
  void onSignOut();
  publisher.publish("auth.updated", null);
  return response;
}
