import fs from "node:fs/promises";
import path from "node:path";

import { getPreferencesStore } from "../stores/preferences";
import { captureServerEvent } from "./capture-server-event";
import { logger } from "./electron-logger";
import { telemetry } from "./telemetry";

let DID_ATTEMPT_QUIT_CAPTURE = false;

export function registerTelemetry(app: Electron.App) {
  const lockFilename = path.join(app.getPath("userData"), "app.lock");
  void app.whenReady().then(async () => {
    let gracefulExit = true;
    try {
      await fs.access(lockFilename);
      logger.warn("Detected non-graceful exit from previous session.");
      gracefulExit = false;
      await fs.unlink(lockFilename);
    } catch {
      // No lock file means graceful exit or first run
    }

    await fs.writeFile(lockFilename, "running");
    captureServerEvent("app.ready", { graceful_exit: gracefulExit });
  });

  app.on("will-quit", (event) => {
    if (!DID_ATTEMPT_QUIT_CAPTURE) {
      DID_ATTEMPT_QUIT_CAPTURE = true;
      event.preventDefault();

      void (async () => {
        await fs.unlink(lockFilename).catch(() => {
          // no-op
        });
        captureServerEvent("app.quit");
        setTimeout(() => {
          app.quit();
        }, 3000);
        await telemetry?.flush();
        await telemetry?.shutdown();
        app.quit();
      })();
    }
  });

  const preferencesStore = getPreferencesStore();
  const currentOptIn = preferencesStore.get("enableUsageMetrics");
  if (typeof currentOptIn === "boolean") {
    void updateOptInState(currentOptIn);
  }

  preferencesStore.onDidChange("enableUsageMetrics", (enableUsageMetrics) => {
    if (typeof enableUsageMetrics === "boolean") {
      void updateOptInState(enableUsageMetrics);
    }
  });
}

async function updateOptInState(isOptedIn: boolean) {
  await (isOptedIn ? telemetry?.optIn() : telemetry?.optOut());
}
