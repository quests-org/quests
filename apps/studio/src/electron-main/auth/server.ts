import {
  auth,
  createGoogleProvider,
  decodeOAuthState,
  store,
} from "@/electron-main/auth/client";
import {
  getAuthServer,
  setAuthServer,
  setAuthServerPort,
} from "@/electron-main/auth/state";
import { logger } from "@/electron-main/lib/electron-logger";
import { publisher } from "@/electron-main/rpc/publisher";
import { getSessionStore } from "@/electron-main/stores/session";
import { serve } from "@hono/node-server";
import { APP_PROTOCOL } from "@quests/shared";
import { detect } from "detect-port";
import { app as electronApp } from "electron";
import { Hono } from "hono";
import { html } from "hono/html";
import fs from "node:fs";
import path from "node:path";

const scopedLogger = logger.scope("auth");

const resourcesPath = electronApp.isPackaged
  ? path.join(process.resourcesPath, "app.asar.unpacked", "resources")
  : path.join(process.cwd(), "resources");

const DEFAULT_PORT = 5705;

const appIconPath = path.join(resourcesPath, "icon.png");
const appIconBase64 = fs.readFileSync(appIconPath, { encoding: "base64" });

export async function startAuthCallbackServer() {
  const existingServer = getAuthServer();
  if (existingServer !== null) {
    scopedLogger.info("Auth callback server is already running");
    return;
  }

  const port = await detect(DEFAULT_PORT);
  setAuthServerPort(port);

  const app = new Hono();
  app.get("/auth/callback/google", async (c) => {
    const code = c.req.query("code");
    const state = c.req.query("state");

    if (
      code === undefined ||
      store.state === null ||
      state !== store.state ||
      store.codeVerifier === null
    ) {
      return c.html(
        renderAuthPage({
          isError: true,
        }),
        400,
      );
    }

    const decodedState = decodeOAuthState(state);
    if (!decodedState) {
      scopedLogger.error("Failed to decode OAuth state");
      return c.html(
        renderAuthPage({
          isError: true,
        }),
        400,
      );
    }

    const google = createGoogleProvider({ port });
    const tokens = await google.validateAuthorizationCode(
      code,
      store.codeVerifier,
    );

    const sessionStore = getSessionStore();
    sessionStore.set("provider", "google");
    sessionStore.set("providerAccessToken", tokens.accessToken());
    sessionStore.set("providerRefreshToken", tokens.refreshToken());
    sessionStore.set("providerIdToken", tokens.idToken());
    sessionStore.set("providerScopes", tokens.scopes());
    sessionStore.set("providerTokenType", tokens.tokenType());

    const headers = new Headers();

    if (decodedState.inviteCode) {
      sessionStore.set("inviteCode", decodedState.inviteCode);
      scopedLogger.info("Invite code received:", decodedState.inviteCode);
      headers.set("x-invite-code", decodedState.inviteCode);
    }

    try {
      const res = await auth.signIn.social(
        {
          idToken: {
            accessToken: tokens.accessToken(),
            refreshToken: tokens.refreshToken(),
            token: tokens.idToken(),
          },
          provider: "google",
        },
        {
          headers,
          onSuccess(ctx) {
            scopedLogger.info("auth/callback/google onSuccess");
            const authToken = ctx.response.headers.get("set-auth-token");
            sessionStore.set("apiBearerToken", authToken);
          },
        },
      );

      if (res.error) {
        scopedLogger.error(res.error.statusText, res.error);
        publisher.publish("auth.updated", {
          error: {
            code: res.error.status,
          },
        });

        return await c.html(
          renderAuthPage({
            isError: true,
            isUnauthorized: res.error.status === 401,
          }),
          400,
        );
      }
    } catch (error) {
      scopedLogger.error("error signing in", error);
      return c.html(
        renderAuthPage({
          isError: true,
        }),
        400,
      );
    }

    publisher.publish("auth.updated", {});
    return c.html(renderAuthPage({}));
  });

  app.get("/test", async (c) => {
    return c.html(renderAuthPage({}));
  });

  scopedLogger.info(
    `Auth callback server running at http://localhost:${port}/`,
  );
  const server = serve({ fetch: app.fetch, port });
  setAuthServer(server);

  return {
    port,
    server,
  };
}

function renderAuthPage({
  isError = false,
  isUnauthorized = false,
}: {
  isError?: boolean;
  isUnauthorized?: boolean;
}) {
  return html`<!DOCTYPE html>
    <html lang="en" class="dark">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
        <title>Quests Sign-in</title>
      </head>
      <body class="dark:bg-stone-950 dark:text-white">
        <div
          class="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10"
        >
          <div class="w-24 h-24 overflow-hidden">
            <div class="w-full h-full flex items-center justify-center">
              <div style="width: 100%; height: 100%;">
                <img src="data:image/png;base64,${appIconBase64}" />
              </div>
            </div>
          </div>
          ${isUnauthorized
            ? html`<h1>
                You don't have access to Quests yet. Please join the
                <a class="underline" href="https://quests.dev">waitlist</a>.
              </h1>`
            : isError
              ? html`<h1>There was an error signing in.</h1>`
              : html`<h2 class="text-xl text-center font-bold">
                    You have successfully signed in to Quests. <br />You may now
                    close this window.
                  </h2>
                  <p>
                    <a
                      class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-9 px-4 py-2 bg-white text-black shadow hover:bg-white/90 mr-2"
                      href="${APP_PROTOCOL}://home"
                      >Open App</a
                    >
                  </p>`}
        </div>
      </body>
    </html>`;
}
