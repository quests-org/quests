import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { getPreferencesStore, isDeveloperMode } from "../stores/preferences";
import { captureServerEvent } from "./capture-server-event";
import { logger } from "./electron-logger";
import { addServerException } from "./server-exceptions";
import { telemetry } from "./telemetry";

let DID_ATTEMPT_QUIT_CAPTURE = false;

const CaptureSchema = z.looseObject({
  event: z.string(),
});

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
  const initialOptIn = preferencesStore.get("enableUsageMetrics");
  if (typeof initialOptIn === "boolean") {
    void updateOptInState(initialOptIn);
  }

  preferencesStore.onDidChange("enableUsageMetrics", (enableUsageMetrics) => {
    if (typeof enableUsageMetrics === "boolean") {
      void updateOptInState(enableUsageMetrics);
    }
  });

  telemetry?.on("capture", (payload) => {
    const parsed = CaptureSchema.safeParse(payload);
    if (!parsed.success) {
      return;
    }
    const { event } = parsed.data;
    if (event === "$exception") {
      // eslint-disable-next-line no-console
      console.groupCollapsed("[Telemetry] Exception captured");
      logger.error(JSON.stringify(payload, null, 2));
      // eslint-disable-next-line no-console
      console.groupEnd();
    }
  });

  // Setup global error handling for dev if telemetry is disabled
  if (!initialOptIn) {
    const handleError = (error: unknown) => {
      logger.error(error);

      if (isDeveloperMode()) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        addServerException({ message: errorMessage, stack: errorStack });
      }
    };

    process.on("uncaughtException", handleError);
    process.on("unhandledRejection", handleError);
  }
}

async function updateOptInState(isOptedIn: boolean) {
  await (isOptedIn ? telemetry?.optIn() : telemetry?.optOut());
}
