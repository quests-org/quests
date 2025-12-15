/// <reference types="electron-vite/node" />

import "dotenv/config";
import { startAuthCallbackServer } from "@/electron-main/auth/server";
import {
  initializeElectronLogging,
  logger,
} from "@/electron-main/lib/electron-logger";
import { setupDBusEnvironment } from "@/electron-main/lib/setup-dbus-env";
import { StudioAppUpdater } from "@/electron-main/lib/update";
import { createApplicationMenu } from "@/electron-main/menus/application";
import { getTabsManager } from "@/electron-main/tabs";
import {
  createMainWindow,
  updateTitleBarOverlay,
} from "@/electron-main/windows/main";
import { getMainWindow } from "@/electron-main/windows/main/instance";
import { is, optimizer, platform } from "@electron-toolkit/utils";
import { APP_PROTOCOL } from "@quests/shared";
import { app, BrowserWindow, dialog, nativeTheme, protocol } from "electron";
import fixPath from "fix-path";
import path from "node:path";

import { createWorkspaceActor } from "./lib/create-workspace-actor";
import { generateUserAgent } from "./lib/generate-user-agent";
import { registerTelemetry } from "./lib/register-telemetry";
import { setupBinDirectory } from "./lib/setup-bin-directory";
import { watchThemePreferenceAndApply } from "./lib/theme-utils";
import { initializeRPC } from "./rpc/initialize";

// Suppress Unstorage dB0 experimental warning
// Remove when stable https://github.com/unjs/unstorage/blob/main/src/drivers/db0.ts
(
  globalThis as unknown as Record<string, boolean>
).__unstorage_db0_experimental_warning__ = true;

const passwordStore = setupDBusEnvironment();

if (platform.isLinux) {
  // Fix issues with Wayland on Linux until it stabilizes
  // https://github.com/RocketChat/Rocket.Chat.Electron/pull/3159
  // https://github.com/electron/electron/pull/48301
  //
  // `ELECTRON_OZONE_PLATFORM_HINT` was removed.
  // https://www.electronjs.org/docs/latest/breaking-changes#planned-breaking-api-changes-380
  app.commandLine.appendSwitch("ozone-platform", "x11");

  const existing = app.commandLine.getSwitchValue("password-store");
  if (existing) {
    logger.info(
      `Command line already has password-store: ${existing} - not overriding`,
    );
  } else if (passwordStore) {
    app.commandLine.appendSwitch("password-store", passwordStore);
    logger.info(`Using password store: ${passwordStore}`);
  }
}

if (!platform.isWindows) {
  // Fix the $PATH on macOS and Linux when run from a GUI app
  fixPath();
}

if (is.dev) {
  let suffix = "";
  if (process.env.ELECTRON_DEV_USER_FOLDER_SUFFIX) {
    suffix = ` (${process.env.ELECTRON_DEV_USER_FOLDER_SUFFIX})`;
  }
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

const userAgent = generateUserAgent();
if (userAgent) {
  app.userAgentFallback = userAgent;
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void app.whenReady().then(async () => {
  if (
    process.platform === "darwin" &&
    !is.dev &&
    !app.isInApplicationsFolder()
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
        return;
      }
    }
  }

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

  app.on("second-instance", (_event, commandLine) => {
    const url = commandLine.find((arg) => arg.startsWith(`${APP_PROTOCOL}://`));
    if (url) {
      handleDeepLink(url);
    }
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
        void tabsManager.addTab({
          params: { success: "true" },
          urlPath: "/checkout",
        });
      } else if (url.includes("checkout?canceled=true")) {
        void tabsManager.addTab({
          params: { canceled: "true" },
          urlPath: "/checkout",
        });
      }
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
