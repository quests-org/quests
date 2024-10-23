import { logger } from "@/electron-main/lib/electron-logger";
import { publisher } from "@/electron-main/rpc/publisher";
import { StoreAIProviderSchema } from "@/shared/schemas/provider";
import { is } from "@electron-toolkit/utils";
import { safeStorage } from "electron";
import Store from "electron-store";
import { z } from "zod";

const ProvidersStoreSchema = z
  .object({
    providers: StoreAIProviderSchema.array().default([]),
  })
  .default({ providers: [] });

type ProvidersStore = z.output<typeof ProvidersStoreSchema>;

let PROVIDERS_STORE: null | Store<ProvidersStore> = null;

export const getProvidersStore = (): Store<ProvidersStore> => {
  if (!PROVIDERS_STORE) {
    const defaultStore: ProvidersStore = {
      providers: [],
    };

    PROVIDERS_STORE = new Store<ProvidersStore>({
      defaults: defaultStore,
      deserialize: (value) => {
        if (is.dev) {
          const parsed = ProvidersStoreSchema.safeParse(JSON.parse(value));

          if (parsed.success) {
            return parsed.data;
          }

          logger.error("Failed to parse providers state", parsed.error);
          return defaultStore;
        }

        if (!safeStorage.isEncryptionAvailable()) {
          logger.error("Encryption is not available");
          return defaultStore;
        }

        let jsonData: unknown;
        try {
          const decryptedValue = safeStorage.decryptString(
            Buffer.from(value, "base64"),
          );
          jsonData = JSON.parse(decryptedValue);
        } catch (error) {
          logger.error("Failed to decrypt or parse JSON", error);
          return defaultStore;
        }

        const parsed = ProvidersStoreSchema.safeParse(jsonData);

        if (parsed.success) {
          return parsed.data;
        }

        logger.error("Failed to parse providers state", parsed.error);
        return defaultStore;
      },
      fileExtension: is.dev ? "json" : "json.enc",
      name: "providers",
      serialize: (value) => {
        if (is.dev) {
          return JSON.stringify(value);
        }

        if (!safeStorage.isEncryptionAvailable()) {
          logger.error("Encryption is not available");
          return "";
        }

        const json = JSON.stringify(value);
        return safeStorage.encryptString(json).toString("base64");
      },
    });

    PROVIDERS_STORE.onDidAnyChange(() => {
      publisher.publish("store-provider.updated", null);
    });
  }

  return PROVIDERS_STORE;
};
