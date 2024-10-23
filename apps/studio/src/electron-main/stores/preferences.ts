import { logger } from "@/electron-main/lib/electron-logger";
import { publisher } from "@/electron-main/rpc/publisher";
import Store from "electron-store";
import { z } from "zod";

/* eslint-disable unicorn/prefer-top-level-await */
const PreferencesStoreSchema = z.object({
  enableUsageMetrics: z.boolean().catch(true),
  lastUpdateCheck: z.number().optional(),
  preferApiKeyOverAccount: z.boolean().catch(false),
  theme: z.enum(["light", "dark", "system"]).catch("system"),
});
/* eslint-enable unicorn/prefer-top-level-await */

type PreferencesStore = z.output<typeof PreferencesStoreSchema>;

let PREFERENCES_STORE: null | Store<PreferencesStore> = null;

export const getPreferencesStore = (): Store<PreferencesStore> => {
  if (PREFERENCES_STORE === null) {
    const defaultPreferences = PreferencesStoreSchema.parse({});
    PREFERENCES_STORE = new Store<PreferencesStore>({
      defaults: defaultPreferences,
      deserialize: (value) => {
        const parsed = PreferencesStoreSchema.safeParse(JSON.parse(value));

        if (parsed.success) {
          return parsed.data;
        }

        logger.error("Failed to parse preferences state", parsed.error);

        return defaultPreferences;
      },
      name: "preferences",
    });

    PREFERENCES_STORE.onDidAnyChange(() => {
      publisher.publish("preferences.updated", null);
    });
  }

  return PREFERENCES_STORE;
};

export const setLastUpdateCheck = (): void => {
  const store = getPreferencesStore();
  store.set("lastUpdateCheck", Date.now());
};
