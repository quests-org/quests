import { API_AUTH_BASE_URL } from "@/electron-main/api/constants";
import { getAuthServerPort } from "@/electron-main/auth/state";
import { logger } from "@/electron-main/lib/electron-logger";
import { publisher } from "@/electron-main/rpc/publisher";
import { getSessionStore } from "@/electron-main/stores/session";
import * as arctic from "arctic";
import { createAuthClient } from "better-auth/client";
import { shell } from "electron";

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
    logger.error("Failed to decode OAuth state:", error);
    return null;
  }
}

/**
 * Initiates social sign-in with Google OAuth2
 * @param inviteCode - Optional invite code to include in the OAuth flow
 * @returns Promise with success status or error
 */
export async function signInSocial(inviteCode?: string) {
  try {
    const authServerPort = getAuthServerPort();
    if (authServerPort === null) {
      throw new Error("Auth server port is not set");
    }

    const google = createGoogleProvider({ port: authServerPort });

    // Generate base state
    const baseState = arctic.generateState();

    // Create state object that includes invite code if provided
    const stateData = {
      state: baseState,
      ...(inviteCode && { inviteCode }),
    };

    // Encode the state data as base64 JSON
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
    return { success: true };
  } catch (error: unknown) {
    logger.error(error);
    return { error: { message: "Unexpected error signing in" } };
  }
}

export async function signOut() {
  try {
    const response = await auth.signOut({});
    const sessionStore = getSessionStore();
    sessionStore.set("apiBearerToken", null);
    publisher.publish("auth.updated", {});
    publisher.publish("subscription.refetch", null);
    return response;
  } catch {
    return { error: { message: "Unexpected error signing out" } };
  }
}
