import { logger } from "@/electron-main/lib/electron-logger";
import { publisher } from "@/electron-main/rpc/publisher";
import pkg from "electron-updater";

import { setLastUpdateCheck } from "../stores/preferences";

const { autoUpdater } = pkg;
const scopedLogger = logger.scope("appUpdater");

export class StudioAppUpdater {
  public constructor() {
    autoUpdater.logger = logger.scope("appUpdater:autoUpdater");
    autoUpdater.autoDownload = true;
    autoUpdater.forceDevUpdateConfig =
      process.env.FORCE_DEV_AUTO_UPDATE === "true";
    // We publish using S3-compatible R2, but download from the public endpoint
    autoUpdater.setFeedURL({
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
