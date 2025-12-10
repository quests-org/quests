import { logger } from "@/electron-main/lib/electron-logger";
import { publisher } from "@/electron-main/rpc/publisher";
import { AIGatewayModelURI } from "@quests/ai-gateway";
import Store from "electron-store";
import { z } from "zod";

/* eslint-disable unicorn/prefer-top-level-await */
const PreferencesStoreSchema = z.object({
  defaultModelURI: AIGatewayModelURI.Schema.optional().catch(undefined),
  developerMode: z.boolean().catch(import.meta.env.DEV), // Default to true when running app in development mode
  enableUsageMetrics: z.boolean().catch(true),
  lastUpdateCheck: z.number().optional(),
  preferApiKeyOverAccount: z.boolean().catch(false),
  // Release channels are not exposed to the user and are used internally for testing
  releaseChannel: z
    .enum(["latest", "beta", "alpha"])
    .optional()
    .catch(undefined),
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

export function getDefaultModelURI(): AIGatewayModelURI.Type | undefined {
  const store = getPreferencesStore();
  return store.get("defaultModelURI");
}

export function isDeveloperMode() {
  const store = getPreferencesStore();
  return store.get("developerMode");
}

export function setDefaultModelURI(modelURI: AIGatewayModelURI.Type): void {
  const store = getPreferencesStore();
  store.set("defaultModelURI", modelURI);
}

export function setLastUpdateCheck(): void {
  const store = getPreferencesStore();
  store.set("lastUpdateCheck", Date.now());
}
