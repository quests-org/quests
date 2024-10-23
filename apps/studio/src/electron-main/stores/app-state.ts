import { logger } from "@/electron-main/lib/electron-logger";
import Store from "electron-store";
import { ulid } from "ulid";
import { z } from "zod";

import { getProvidersStore } from "./providers";

function generateTelemetryId(): string {
  return `anon-${ulid().toLowerCase()}`;
}

const DEFAULT_TELEMETRY_ID = "studio-main-default";

/* eslint-disable unicorn/prefer-top-level-await */
const AppStateSchema = z.object({
  hasCompletedProviderSetup: z.boolean().catch(false),
  telemetryId: z.string().catch(DEFAULT_TELEMETRY_ID),
});
/* eslint-enable unicorn/prefer-top-level-await */

type AppState = z.output<typeof AppStateSchema>;

let APP_STATE_STORE: null | Store<AppState> = null;

export const getAppStateStore = (): Store<AppState> => {
  if (APP_STATE_STORE === null) {
    const defaultAppState = AppStateSchema.parse({});
    APP_STATE_STORE = new Store<AppState>({
      defaults: defaultAppState,
      deserialize: (value) => {
        const parsed = AppStateSchema.safeParse(JSON.parse(value));

        if (parsed.success) {
          return parsed.data;
        }

        logger.error("Failed to parse app state", parsed.error);

        return defaultAppState;
      },
      name: "app-state",
    });

    if (!APP_STATE_STORE.get("hasCompletedProviderSetup")) {
      const providersStore = getProvidersStore();
      const providers = providersStore.get("providers");
      const hasAnyProvider = providers.length > 0;

      if (hasAnyProvider) {
        APP_STATE_STORE.set("hasCompletedProviderSetup", true);
      }
    }

    if (APP_STATE_STORE.get("telemetryId") === DEFAULT_TELEMETRY_ID) {
      APP_STATE_STORE.set("telemetryId", generateTelemetryId());
    }
  }

  return APP_STATE_STORE;
};
