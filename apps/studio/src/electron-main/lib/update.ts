import { type RendererHandlers } from "@/electron-main/handlers/renderer-handlers";
import { logger } from "@/electron-main/lib/electron-logger";
import { type RendererHandlersCaller } from "@egoist/tipc/main";
import pkg from "electron-updater";

import { setLastUpdateCheck } from "../stores/preferences";

const { autoUpdater } = pkg;
const scopedLogger = logger.scope("appUpdater");

export class StudioAppUpdater {
  private renderHandlers: RendererHandlersCaller<RendererHandlers>;

  public constructor({
    renderHandlers,
  }: {
    renderHandlers: RendererHandlersCaller<RendererHandlers>;
  }) {
    this.renderHandlers = renderHandlers;
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
      this.renderHandlers.updateAvailable.send({
        updateInfo,
      });
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
      this.renderHandlers.updateDownloaded.send({
        updateInfo,
      });
    });

    autoUpdater.on("error", (err) => {
      scopedLogger.error("AutoUpdater error:", err);
      this.renderHandlers.updateError.send({
        error: err,
      });
    });
  }

  public checkForUpdates({ notify }: { notify?: boolean } = {}) {
    if (notify) {
      this.renderHandlers.updateCheckStarted.send();
      autoUpdater.once("update-not-available", (updateInfo) => {
        this.renderHandlers.updateNotAvailable.send({
          updateInfo,
        });
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
