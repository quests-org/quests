import { getToken } from "@/electron-main/api/utils";
import { getAuthServerPort } from "@/electron-main/auth/state";
import { publisher } from "@/electron-main/rpc/publisher";
import { getSessionStore } from "@/electron-main/stores/session";
import { mergeGenerators } from "@quests/shared/merge-generators";
import * as arctic from "arctic";
import { createAuthClient } from "better-auth/client";
import { shell } from "electron";

import { captureServerException } from "../lib/capture-server-exception";

export const auth = createAuthClient({
  baseURL: `${import.meta.env.MAIN_VITE_QUESTS_API_BASE_URL}/auth`,
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
    import.meta.env.MAIN_VITE_GOOGLE_CLIENT_ID,
    import.meta.env.MAIN_VITE_GOOGLE_CLIENT_SECRET,
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

  const promise = new Promise((resolve, reject) => {
    const onError = publisher.subscribe("auth.sign-in-error");
    const onSuccess = publisher.subscribe("auth.sign-in-success");

    async function waitForAuthUpdate() {
      for await (const payload of mergeGenerators([onError, onSuccess])) {
        if ("error" in payload) {
          reject(new Error("Sign in failed", { cause: payload.error }));
          break;
        } else {
          resolve(payload);
          break;
        }
      }
    }

    void waitForAuthUpdate();
  });

  return promise;
}

export async function signOut() {
  const response = await auth.signOut({
    fetchOptions: {
      headers: {
        authorization: `Bearer ${getToken() ?? ""}`,
      },
    },
  });
  if (response.error) {
    captureServerException(
      new Error("Sign out failed", { cause: response.error }),
      { scopes: ["auth"] },
    );
  }
  const sessionStore = getSessionStore();
  sessionStore.set("apiBearerToken", null);
  return response;
}
