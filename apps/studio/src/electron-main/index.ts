/// <reference types="electron-vite/node" />

import "@/electron-main/setup-environment"; // This must be imported first
import { startAuthCallbackServer } from "@/electron-main/auth/server";
import { StudioAppUpdater } from "@/electron-main/lib/update";
import { createApplicationMenu } from "@/electron-main/menus";
import { getTabsManager } from "@/electron-main/tabs";
import {
  createMainWindow,
  updateTitleBarOverlay,
} from "@/electron-main/windows/main";
import { getMainWindow } from "@/electron-main/windows/main/instance";
import { is, optimizer } from "@electron-toolkit/utils";
import { APP_PROTOCOL } from "@quests/shared";
import {
  app,
  BrowserWindow,
  dialog,
  nativeTheme,
  protocol,
  session,
} from "electron";

import { createWorkspaceActor } from "./lib/create-workspace-actor";
import { logger } from "./lib/electron-logger";
import { generateUserAgent } from "./lib/generate-user-agent";
import { registerTelemetry } from "./lib/register-telemetry";
import { runMigrations } from "./lib/run-migrations";
import { setupBinDirectory } from "./lib/setup-bin-directory";
import { watchThemePreferenceAndApply } from "./lib/theme-utils";
import { initializeRPC } from "./rpc/initialize";
let appUpdater: StudioAppUpdater | undefined;

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

const userAgent = generateUserAgent();
if (userAgent) {
  app.userAgentFallback = userAgent;
}

const gotTheLock = app.requestSingleInstanceLock();

if (gotTheLock) {
  app.on("second-instance", (_event, commandLine) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
      const tabsManager = getTabsManager();
      tabsManager?.focusCurrentTab();
    }

    const url = commandLine.find((arg) => arg.startsWith(`${APP_PROTOCOL}://`));
    if (url) {
      handleDeepLink(url);
    }
  });
} else {
  if (is.dev) {
    logger.info("App already running, quitting");
  }
  app.quit();
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void app.whenReady().then(async () => {
  if (
    process.platform === "darwin" &&
    !is.dev &&
    !app.isInApplicationsFolder() &&
    process.env.SKIP_MOVE_TO_APPLICATIONS !== "true"
  ) {
    const choice = dialog.showMessageBoxSync({
      buttons: ["Move to Applications Folder", "Not Now"],
      cancelId: 1,
      defaultId: 0,
      message:
        "Quests works best when run from the Applications folder. Would you like to move it now?",
      title: "Move to Applications Folder?",
      type: "question",
    });

    if (choice === 0) {
      const moved = app.moveToApplicationsFolder({
        conflictHandler: () => {
          return (
            dialog.showMessageBoxSync({
              buttons: ["Replace", "Cancel"],
              cancelId: 1,
              defaultId: 0,
              message:
                "An app with the same name already exists in the Applications folder. Do you want to replace it?",
              title: "Replace Existing App?",
              type: "question",
            }) === 0
          );
        },
      });

      if (moved) {
        app.quit();
        return;
      }
    }
  }

  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      // Disable fullscreen API for things like video players
      if (permission === "fullscreen") {
        callback(false);
      } else {
        callback(true);
      }
    },
  );

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window, { zoom: true });
  });

  createApplicationMenu();
  watchThemePreferenceAndApply(updateTitleBarOverlay);
  nativeTheme.on("updated", () => {
    updateTitleBarOverlay();
  });

  await setupBinDirectory();

  await runMigrations();

  appUpdater = new StudioAppUpdater();
  appUpdater.pollForUpdates();

  const { actor: workspaceRef, workspaceConfig } = createWorkspaceActor();

  initializeRPC({ appUpdater, workspaceConfig, workspaceRef });

  await createMainWindow();

  void startAuthCallbackServer();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow();
    }
  });
  app.on("open-url", (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });
});

function handleDeepLink(url: string) {
  const mainWindow = getMainWindow();
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();

    const tabsManager = getTabsManager();
    if (tabsManager) {
      if (url.includes("checkout?success=true")) {
        tabsManager.addTab({
          params: { success: "true" },
          urlPath: "/checkout",
        });
      } else if (url.includes("checkout?canceled=true")) {
        tabsManager.addTab({
          params: { canceled: "true" },
          urlPath: "/checkout",
        });
      }
      tabsManager.focusCurrentTab();
    }
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
