import { logger } from "@/electron-main/lib/electron-logger";
import { publisher } from "@/electron-main/rpc/publisher";
import { is } from "@electron-toolkit/utils";
import { AIGatewayProviderConfig } from "@quests/ai-gateway";
import { safeStorage } from "electron";
import Store from "electron-store";
import { z } from "zod";

const ProviderConfigsStoreSchema = z
  .object({
    // Named "providers" originally, but now "providerConfigs" to avoid
    // confusion with the AIProviderType type. Kept as "providers" here to
    // support existing data.
    providers: AIGatewayProviderConfig.Schema.array().default([]),
  })
  .default({ providers: [] });

type ProviderConfigsStore = z.output<typeof ProviderConfigsStoreSchema>;

let PROVIDER_CONFIGS_STORE: null | Store<ProviderConfigsStore> = null;

export const getProviderConfigsStore = (): Store<ProviderConfigsStore> => {
  if (!PROVIDER_CONFIGS_STORE) {
    const defaultStore: ProviderConfigsStore = {
      providers: [],
    };

    PROVIDER_CONFIGS_STORE = new Store<ProviderConfigsStore>({
      defaults: defaultStore,
      deserialize: (value) => {
        if (is.dev) {
          const parsed = ProviderConfigsStoreSchema.safeParse(
            JSON.parse(value),
          );

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

        const parsed = ProviderConfigsStoreSchema.safeParse(jsonData);

        if (parsed.success) {
          return parsed.data;
        }

        logger.error("Failed to parse provider configs", parsed.error);
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

    PROVIDER_CONFIGS_STORE.onDidAnyChange(() => {
      publisher.publish("provider-config.updated", null);
    });
  }

  return PROVIDER_CONFIGS_STORE;
};
