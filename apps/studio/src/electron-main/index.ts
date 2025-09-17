/// <reference types="electron-vite/node" />

import "dotenv/config";
import { startAuthCallbackServer } from "@/electron-main/auth/server";
import { type RendererHandlers } from "@/electron-main/handlers/renderer-handlers";
import {
  initializeElectronLogging,
  logger,
} from "@/electron-main/lib/electron-logger";
import { StudioAppUpdater } from "@/electron-main/lib/update";
import { createApplicationMenu } from "@/electron-main/menus/application";
import { getTabsManager } from "@/electron-main/tabs";
import {
  createMainWindow,
  toolbarRenderHandlers,
  updateTitleBarOverlay,
} from "@/electron-main/windows/main";
import { isFeatureEnabled } from "@/shared/features";
import { type RendererHandlersCaller } from "@egoist/tipc/main";
import { is, optimizer } from "@electron-toolkit/utils";
import { APP_PROTOCOL } from "@quests/shared";
import { app, BrowserWindow, nativeTheme, protocol } from "electron";
import path from "node:path";

import { createWorkspaceActor } from "./lib/create-workspace-actor";
import { registerTelemetry } from "./lib/register-telemetry";
import { watchThemePreferenceAndApply } from "./lib/theme-utils";
import { initializeRPC } from "./rpc/initialize";

if (is.dev) {
  let suffix = "";
  if (process.env.ELECTRON_USE_NEW_USER_FOLDER === "true") {
    suffix = ` (${Date.now().toString()})`;
  }
  const DEV_APP_NAME = `Quests (Dev${suffix})`;
  if (suffix) {
    logger.info(`Using user folder ${DEV_APP_NAME}`);
  }

  // Sandbox userData during development to Quests/Quests (Dev)/*
  // Must be done as soon as possible because it's stateful
  app.setPath(
    "userData",
    path.join(app.getPath("userData"), "..", DEV_APP_NAME),
  );
  app.setName(DEV_APP_NAME);
}

let appUpdater: StudioAppUpdater | undefined;

const renderHandlersProxy = new Proxy<RendererHandlersCaller<RendererHandlers>>(
  Object.create(null) as RendererHandlersCaller<RendererHandlers>,
  {
    get: <K extends keyof RendererHandlers>(_target: unknown, prop: K) => {
      const tabsManager = getTabsManager();
      return {
        send: (...args: Parameters<RendererHandlers[K]>) => {
          const handlers = [
            ...(tabsManager?.getTabRenderHandlers() ?? []),
            toolbarRenderHandlers,
          ].filter((h) => h !== undefined);
          for (const handler of handlers) {
            const method = handler[prop];
            if (typeof method === "object" && "send" in method) {
              (
                method.send as (
                  ...args: Parameters<RendererHandlers[K]>
                ) => void
              )(...args);
            }
          }
        },
      };
    },
  },
);

initializeElectronLogging();

protocol.registerSchemesAsPrivileged([
  {
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
    },
    scheme: APP_PROTOCOL,
  },
]);

app.setAsDefaultProtocolClient(APP_PROTOCOL);

registerTelemetry(app);

// eslint-disable-next-line unicorn/prefer-top-level-await
void app.whenReady().then(async () => {
  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createApplicationMenu({
    appUpdater,
    renderHandlersProxy,
  });

  watchThemePreferenceAndApply(updateTitleBarOverlay);
  nativeTheme.on("updated", () => {
    updateTitleBarOverlay();
  });

  appUpdater = new StudioAppUpdater({
    renderHandlers: renderHandlersProxy,
  });
  appUpdater.pollForUpdates();

  const { actor: workspaceRef, workspaceConfig } = createWorkspaceActor();

  initializeRPC({ appUpdater, workspaceConfig, workspaceRef });

  await createMainWindow();

  if (isFeatureEnabled("questsAccounts")) {
    void startAuthCallbackServer();
  }

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
