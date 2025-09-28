import { logger } from "@/electron-main/lib/electron-logger";
import { publisher } from "@/electron-main/rpc/publisher";
import { app } from "electron";
import pkg, { type ProgressInfo, type UpdateInfo } from "electron-updater";
import fs from "node:fs";
import os from "node:os";

import { getPreferencesStore, setLastUpdateCheck } from "../stores/preferences";

const { autoUpdater } = pkg;
const scopedLogger = logger.scope("appUpdater");

const IS_MACOS_INTEL = os.platform() === "darwin" && os.arch() === "x64";
// macOS on Intel is the only custom channel, otherwise use the defaults.
const MACOS_INTEL_CHANNEL = "latest-x64";

export type AppUpdaterStatus =
  | AppUpdaterStatusChecking
  | AppUpdaterStatusDownloading
  | AppUpdaterStatusError
  | AppUpdaterStatusInstalling
  | AppUpdaterStatusNotAvailable
  | AppUpdaterStatusWithUpdateInfo;

interface AppUpdaterStatusChecking extends BaseAppUpdaterStatus {
  type: "checking";
}

interface AppUpdaterStatusDownloading extends BaseAppUpdaterStatus {
  progress: ProgressInfo;
  type: "downloading";
}

interface AppUpdaterStatusError extends BaseAppUpdaterStatus {
  message: string;
  type: "error";
}

interface AppUpdaterStatusInstalling extends BaseAppUpdaterStatus {
  notice?: string;
  type: "installing";
}

interface AppUpdaterStatusNotAvailable extends BaseAppUpdaterStatus {
  type: "not-available";
}

interface AppUpdaterStatusWithUpdateInfo extends BaseAppUpdaterStatus {
  type: "available" | "cancelled" | "downloaded" | "inactive" | "not-available";
  updateInfo: null | UpdateInfo;
}

interface BaseAppUpdaterStatus {
  notifyUser: boolean;
}

export class StudioAppUpdater {
  public get status() {
    return this.#status;
  }

  #notify = false;
  #status: AppUpdaterStatus | null = null;

  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures
  private set status(status: AppUpdaterStatus | null) {
    this.#status = status;
    if (status) {
      publisher.publish("updates.status", { status });
    }
  }

  public constructor() {
    autoUpdater.logger = logger.scope("appUpdater:autoUpdater");
    autoUpdater.autoDownload = true;
    autoUpdater.forceDevUpdateConfig =
      process.env.FORCE_DEV_AUTO_UPDATE === "true";

    autoUpdater.setFeedURL({
      channel: getChannel(),
      provider: "generic",
      updaterCacheDirName: "quests-desktop-updater",
      url: "https://releases.quests.dev",
    });

    autoUpdater.on("update-available", (updateInfo) => {
      scopedLogger.info("Update available");
      this.status = {
        notifyUser: this.#notify,
        type: "available",
        updateInfo,
      };
    });

    autoUpdater.on("update-not-available", (updateInfo) => {
      scopedLogger.info("Update not available");
      this.status = {
        notifyUser: this.#notify,
        type: "not-available",
        updateInfo,
      };
    });

    autoUpdater.on("download-progress", (progress) => {
      scopedLogger.info(
        `Download progress: ${progress.percent}%, ${progress.transferred}/${progress.total}`,
      );
      this.status = {
        notifyUser: this.#notify,
        progress,
        type: "downloading",
      };
    });

    autoUpdater.on("update-downloaded", (updateInfo) => {
      scopedLogger.info("Update downloaded");
      this.status = {
        // Always notify when an updates is ready to install
        notifyUser: true,
        type: "downloaded",
        updateInfo,
      };
    });

    autoUpdater.on("error", (err) => {
      scopedLogger.error("AutoUpdater error:", err);
      this.status = {
        message: err.message,
        notifyUser: this.#notify,
        type: "error",
      };
    });

    autoUpdater.on("update-cancelled", (updateInfo) => {
      scopedLogger.info("Update cancelled");
      this.status = {
        notifyUser: this.#notify,
        type: "cancelled",
        updateInfo,
      };
    });

    publisher.subscribe("updates.trigger-check", () => {
      void this.checkForUpdates({ notify: true });
    });
  }

  public async checkForUpdates({ notify }: { notify?: boolean } = {}) {
    this.#notify = notify ?? false;

    this.status = {
      notifyUser: this.#notify,
      type: "checking",
    };

    autoUpdater.once("update-not-available", (updateInfo) => {
      this.status = {
        notifyUser: this.#notify,
        type: "not-available",
        updateInfo,
      };
    });

    const isUpdaterActive = autoUpdater.isUpdaterActive();

    if (!isUpdaterActive) {
      this.status = {
        notifyUser: this.#notify,
        type: "inactive",
        updateInfo: null,
      };
      return;
    }

    return await autoUpdater.checkForUpdates().catch((error: unknown) => {
      scopedLogger.error("Error checking for updates:", error);
    });
  }

  public pollForUpdates() {
    void this.checkForUpdates();
    setInterval(
      () => {
        void this.checkForUpdates();
        setLastUpdateCheck();
      },
      60 * 60 * 1000,
    );
  }

  public quitAndInstall() {
    try {
      if (os.platform() === "linux") {
        // On Linux, use app.relaunch() and app.quit() to avoid hanging issues
        // with autoUpdater.quitAndInstall()
        const notice = isUbuntu()
          ? 'Update is installing and may take a few minutes to complete. Please ignore any "Force quit" dialogs. The app will restart when complete.'
          : "Update is installing. Please allow a few minutes for the update to complete. The app will restart when complete.";

        this.status = {
          notice,
          notifyUser: true,
          type: "installing",
        };

        // Use app.relaunch() and app.quit() for Linux to avoid hanging
        app.relaunch();
        app.quit();
        return;
      }

      this.status = {
        notifyUser: true,
        type: "installing",
      };
      autoUpdater.quitAndInstall();
    } catch (error) {
      scopedLogger.error("Error quitting and installing:", error);
      this.status = {
        message: error instanceof Error ? error.message : String(error),
        notifyUser: true,
        type: "error",
      };
    }
  }
}

function getChannel() {
  // beta and alpha channels are not supported on macOS x64/intel due to lack of support
  // from electron-builder.
  // https://github.com/electron-userland/electron-builder/issues/5592
  if (IS_MACOS_INTEL) {
    return MACOS_INTEL_CHANNEL;
  }

  const preferencesStore = getPreferencesStore();
  // Release channels are used internally for testing and must be set on the preferences
  // store manually.
  const channel = preferencesStore.get("releaseChannel");
  if (!channel || channel === "latest") {
    // Use defaults
    return;
  }

  return channel;
}

function isUbuntu(): boolean {
  if (os.platform() !== "linux") {
    return false;
  }

  try {
    const osRelease = fs.readFileSync("/etc/os-release", "utf8");
    return osRelease.includes("Ubuntu");
  } catch {
    return false;
  }
}
