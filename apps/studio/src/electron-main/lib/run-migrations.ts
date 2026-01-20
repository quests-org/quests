import { getAppStateStore } from "@/electron-main/stores/app-state";
import { getProviderConfigsStore } from "@/electron-main/stores/provider-configs";
import { app } from "electron";
import semver from "semver";

import { logger } from "./electron-logger";
import { setDefaultModel } from "./set-default-model";

export async function runMigrations(): Promise<void> {
  const appStateStore = getAppStateStore();
  const lastMigratedVersion = appStateStore.get("lastMigratedVersion");
  const currentVersion = app.getVersion();

  // If this is a fresh install or we've already migrated to this version, skip
  if (lastMigratedVersion && semver.gte(lastMigratedVersion, currentVersion)) {
    return;
  }

  logger.info(
    `Running migrations from version ${lastMigratedVersion ?? "initial install"} to ${currentVersion}`,
  );

  // Migration: Reset default model for users upgrading from 1.7.4 or earlier
  if (!lastMigratedVersion || semver.lte(lastMigratedVersion, "1.7.4")) {
    const providersStore = getProviderConfigsStore();
    const hasProviders = providersStore.get("providers").length > 0;

    if (hasProviders) {
      logger.info(
        "Migration: Resetting default model for upgrade from v1.7.4 or earlier",
      );
      await setDefaultModel();
    }
  }

  // Update the last migrated version to current version
  appStateStore.set("lastMigratedVersion", currentVersion);
  logger.info(`Migrations complete, updated to version ${currentVersion}`);
}
