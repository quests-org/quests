import { is, platform } from "@electron-toolkit/utils";
import { app } from "electron";
import fixPath from "fix-path";
import path from "node:path";

import { initializeElectronLogging, logger } from "./lib/electron-logger";
import { setupDBusEnvironment } from "./lib/setup-dbus-env";

/**
 * Configures the Electron app's userData directory.
 * This MUST be called before any other Electron APIs that depend on userData.
 * Especially electron-store, which runs in the module scope.
 */
function configureUserDataDirectory() {
  if (process.env.ELECTRON_USER_DATA_DIR) {
    // eslint-disable-next-line no-console
    console.log(
      `Using custom user data dir: ${process.env.ELECTRON_USER_DATA_DIR}`,
    );
    app.setPath("userData", process.env.ELECTRON_USER_DATA_DIR);
  } else if (is.dev) {
    let suffix = "";
    if (process.env.ELECTRON_DEV_USER_FOLDER_SUFFIX) {
      suffix = ` (${process.env.ELECTRON_DEV_USER_FOLDER_SUFFIX})`;
    }
    if (process.env.ELECTRON_USE_NEW_USER_FOLDER === "true") {
      suffix = ` (${Date.now().toString()})`;
    }
    const DEV_APP_NAME = `Quests (Dev${suffix})`;
    if (suffix) {
      // eslint-disable-next-line no-console
      console.log(`Using user folder ${DEV_APP_NAME}`);
    }
    // Sandbox userData during development to Quests/Quests (Dev)/*
    // Must be done as soon as possible because it's stateful
    app.setPath(
      "userData",
      path.join(app.getPath("userData"), "..", DEV_APP_NAME),
    );
    app.setName(DEV_APP_NAME);
  }
}

configureUserDataDirectory();

initializeElectronLogging();

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
