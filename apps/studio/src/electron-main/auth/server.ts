import { onSignIn } from "@/electron-main/api/client";
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
import { captureServerEvent } from "@/electron-main/lib/capture-server-event";
import { captureServerException } from "@/electron-main/lib/capture-server-exception";
import { setDefaultModelIfNeeded } from "@/electron-main/lib/set-default-model";
import { publisher } from "@/electron-main/rpc/publisher";
import { getSessionStore } from "@/electron-main/stores/session";
import { getMainWindow } from "@/electron-main/windows/main/instance";
import { serve } from "@hono/node-server";
import { APP_PROTOCOL, SUPPORT_EMAIL } from "@quests/shared";
import { cva } from "class-variance-authority";
import { detect } from "detect-port";
import { app as electronApp } from "electron";
import { Hono } from "hono";
import { html } from "hono/html";
import fs from "node:fs";
import path from "node:path";

function focusMainWindow() {
  const mainWindow = getMainWindow();
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
}

const resourcesPath = electronApp.isPackaged
  ? path.join(process.resourcesPath, "app.asar.unpacked", "resources")
  : path.join(process.cwd(), "resources");

const DEFAULT_PORT = process.env.NODE_ENV === "development" ? 5605 : 5705;

const appIconPath = path.join(resourcesPath, "icon.png");
const appIconBase64 = fs.readFileSync(appIconPath, { encoding: "base64" });

export async function startAuthCallbackServer() {
  const existingServer = getAuthServer();
  if (existingServer !== null) {
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
      captureServerException(
        new Error("OAuth callback received with invalid state or missing code"),
        { scopes: ["auth"] },
      );
      focusMainWindow();
      return c.html(renderAuthPage({ isError: true }), 400);
    }

    const decodedState = decodeOAuthState(state);
    if (!decodedState) {
      focusMainWindow();
      return c.html(renderAuthPage({ isError: true }), 400);
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
            const authToken = ctx.response.headers.get("set-auth-token");
            sessionStore.set("apiBearerToken", authToken);
          },
        },
      );

      if (res.error) {
        captureServerException(
          new Error("Sign in failed", { cause: res.error }),
          { scopes: ["auth"] },
        );
        publisher.publish("auth.sign-in-error", {
          error: res.error,
        });
        publisher.publish("auth.updated", null);
        focusMainWindow();
        return await c.html(
          renderAuthPage({
            isError: true,
            isUnauthorized: res.error.status === 401,
          }),
          400,
        );
      }
    } catch (error) {
      captureServerException(new Error("Error signing in", { cause: error }), {
        scopes: ["auth"],
      });
      focusMainWindow();
      return c.html(renderAuthPage({ isError: true }), 400);
    }

    captureServerEvent("auth.signed_in");
    void setDefaultModelIfNeeded({ forceUpdateForNewLogin: true });
    void onSignIn();
    publisher.publish("auth.sign-in-success", { success: true });
    publisher.publish("auth.updated", null);
    focusMainWindow();
    return c.html(renderAuthPage({}));
  });

  app.get("/test", async (c) => {
    return c.html(renderAuthPage({}));
  });
  const server = serve({ fetch: app.fetch, port });
  setAuthServer(server);

  return {
    port,
    server,
  };
}

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-white/20 h-9 px-4 py-2",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        default: "bg-white text-black shadow hover:bg-white/90",
        outline: "border border-stone-700 text-white hover:bg-stone-800",
      },
    },
  },
);

const button = (variant: "default" | "outline", href: string, label: string) =>
  html`<a class="${buttonVariants({ variant })}" href="${href}">${label}</a>`;

const contactUsButton = button(
  "outline",
  `mailto:${SUPPORT_EMAIL}`,
  "Contact us",
);

function renderAuthPage({
  isError = false,
  isUnauthorized = false,
}: {
  isError?: boolean;
  isUnauthorized?: boolean;
}) {
  const renderContent = () => {
    if (isUnauthorized) {
      return html`<h1 class="text-xl text-center font-bold">
          You don't have access to Quests yet.
        </h1>
        <p class="text-center text-stone-400">
          Please join the
          <a class="underline" href="https://quests.dev">waitlist</a>.
        </p>
        <p class="flex gap-2">
          ${contactUsButton}
          ${button("default", `${APP_PROTOCOL}://`, "View error in Quests")}
        </p>`;
    }
    if (isError) {
      return html`<h1 class="text-xl text-center font-bold">
          There was an error signing in.
        </h1>
        <p class="flex gap-2">
          ${contactUsButton}
          ${button("default", `${APP_PROTOCOL}://`, "View error in Quests")}
        </p>`;
    }
    return html`<h2 class="text-xl text-center font-bold">
        You have successfully signed in to Quests. <br />You may now close this
        window.
      </h2>
      <p>${button("default", `${APP_PROTOCOL}://home`, "Open Quests")}</p>`;
  };

  return html`<!DOCTYPE html>
    <html lang="en" class="dark">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
        <title>Sign in to Quests</title>
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
          ${renderContent()}
        </div>
      </body>
    </html>`;
}
