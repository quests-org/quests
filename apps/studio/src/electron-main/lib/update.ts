import { logger } from "@/electron-main/lib/electron-logger";
import { publisher } from "@/electron-main/rpc/publisher";
import pkg from "electron-updater";
import os from "node:os";

import { getPreferencesStore, setLastUpdateCheck } from "../stores/preferences";

const { autoUpdater } = pkg;
const scopedLogger = logger.scope("appUpdater");

const IS_MACOS_INTEL = os.platform() === "darwin" && os.arch() === "x64";
// macOS on Intel is the only custom channel, otherwise use the defaults.
const MACOS_INTEL_CHANNEL = "latest-x64";

export class StudioAppUpdater {
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
      publisher.publish("updates.available", { updateInfo });
    });

    autoUpdater.on("update-not-available", () => {
      scopedLogger.info("Update not available");
    });

    autoUpdater.on("download-progress", (progress) => {
      scopedLogger.info(
        `Download progress: ${progress.percent}%, ${progress.transferred}/${progress.total}`,
      );
    });

    autoUpdater.on("update-downloaded", (updateInfo) => {
      scopedLogger.info("Update downloaded");
      publisher.publish("updates.downloaded", { updateInfo });
    });

    autoUpdater.on("error", (err) => {
      scopedLogger.error("AutoUpdater error:", err);
      publisher.publish("updates.error", {
        error: { message: err.message },
      });
    });
  }

  public checkForUpdates({ notify }: { notify?: boolean } = {}) {
    if (notify) {
      publisher.publish("updates.check-started", null);
      autoUpdater.once("update-not-available", (updateInfo) => {
        publisher.publish("updates.not-available", { updateInfo });
      });
    }

    return autoUpdater.checkForUpdates().catch((error: unknown) => {
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
    autoUpdater.quitAndInstall();
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
