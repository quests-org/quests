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
import { setDefaultModel } from "@/electron-main/lib/set-default-model";
import { publisher } from "@/electron-main/rpc/publisher";
import { getSessionStore } from "@/electron-main/stores/session";
import { getMainWindow } from "@/electron-main/windows/main/instance";
import { serve } from "@hono/node-server";
import { APP_PROTOCOL, SUPPORT_EMAIL } from "@quests/shared";
import { detect } from "detect-port";
import { Hono } from "hono";
import { html } from "hono/html";
import fs from "node:fs/promises";
import { tv } from "tailwind-variants";

function focusMainWindow() {
  const mainWindow = getMainWindow();
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    // Temporarily set always-on-top to reliably bring window to front on Windows
    mainWindow.setAlwaysOnTop(true);
    mainWindow.focus();
    mainWindow.setAlwaysOnTop(false);
  }
}

const DEFAULT_PORT = process.env.NODE_ENV === "development" ? 5605 : 5705;

export async function startAuthCallbackServer() {
  const existingServer = getAuthServer();
  if (existingServer !== null) {
    return;
  }

  const port = await detect(DEFAULT_PORT);
  setAuthServerPort(port);

  const app = new Hono();

  app.get("/icon.png", async (c) => {
    try {
      const { default: appIconPath } = await import(
        "../../../resources/icon.png?asset"
      );
      const iconBuffer = await fs.readFile(appIconPath);
      return c.body(iconBuffer, 200, {
        "Content-Type": "image/png",
      });
    } catch (error) {
      captureServerException(
        new Error("Failed to load app icon", { cause: error }),
        { scopes: ["auth"] },
      );
      return c.body(null, 404);
    }
  });

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

    void setDefaultModel();
    publisher.publish("auth.sign-in-success", { success: true });
    focusMainWindow();
    captureServerEvent("auth.signed_in");
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

const buttonVariants = tv({
  base: "inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-white/20",
  defaultVariants: {
    variant: "default",
  },
  variants: {
    variant: {
      default: "bg-white text-black shadow hover:bg-white/90",
      outline: "border border-stone-700 text-white hover:bg-stone-800",
    },
  },
});

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
          <div id="icon-container" class="flex items-center justify-center">
            <img id="app-icon" src="/icon.png" alt="Quests" class="w-24 h-24" />
          </div>
          ${renderContent()}
        </div>
        <script>
          document
            .getElementById("app-icon")
            .addEventListener("error", function () {
              document.getElementById("icon-container").innerHTML =
                '<h1 class="text-3xl font-bold">Quests</h1>';
            });
        </script>
      </body>
    </html>`;
}
