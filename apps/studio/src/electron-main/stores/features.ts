import { logger } from "@/electron-main/lib/electron-logger";
import { publisher } from "@/electron-main/rpc/publisher";
import { type FeatureName, FeatureNameSchema } from "@/shared/features";
import Store from "electron-store";
import { z } from "zod";

const FeaturesStoreSchema = z.record(
  FeatureNameSchema,
  // eslint-disable-next-line unicorn/prefer-top-level-await
  z.boolean().catch(false),
);

type FeaturesStore = z.output<typeof FeaturesStoreSchema>;

let FEATURES_STORE: null | Store<FeaturesStore> = null;

export const getFeaturesStore = (): Store<FeaturesStore> => {
  if (FEATURES_STORE === null) {
    const defaultFeatures = FeaturesStoreSchema.parse({});
    FEATURES_STORE = new Store<FeaturesStore>({
      defaults: defaultFeatures,
      deserialize: (value) => {
        const parsed = FeaturesStoreSchema.safeParse(JSON.parse(value));

        if (parsed.success) {
          return parsed.data;
        }

        logger.error("Failed to parse features state", parsed.error);

        return defaultFeatures;
      },
      name: "features",
    });

    FEATURES_STORE.onDidAnyChange(() => {
      publisher.publish("features.updated", null);
    });
  }

  return FEATURES_STORE;
};

export const isFeatureEnabled = (feature: FeatureName): boolean => {
  const store = getFeaturesStore();
  return store.get(feature);
};
