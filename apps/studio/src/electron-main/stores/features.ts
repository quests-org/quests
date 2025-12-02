import { logger } from "@/electron-main/lib/electron-logger";
import { publisher } from "@/electron-main/rpc/publisher";
import { FeatureNameSchema } from "@/shared/features";
import Store from "electron-store";
import { z } from "zod";

const PermissiveFeaturesSchema = z.record(
  z.string(),
  // eslint-disable-next-line unicorn/prefer-top-level-await
  z.boolean().catch(false),
);

const FeaturesStoreSchema = z.record(
  FeatureNameSchema,
  // eslint-disable-next-line unicorn/prefer-top-level-await
  z.boolean().catch(false),
);

type FeaturesStore = z.output<typeof FeaturesStoreSchema>;

const parseFeatures = (data: unknown): FeaturesStore => {
  const permissiveParsed = PermissiveFeaturesSchema.safeParse(data);

  if (!permissiveParsed.success) {
    return FeaturesStoreSchema.parse({});
  }

  const validFeatures: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(permissiveParsed.data)) {
    const featureNameParsed = FeatureNameSchema.safeParse(key);
    if (featureNameParsed.success) {
      validFeatures[key] = value;
    }
  }

  return FeaturesStoreSchema.parse(validFeatures);
};

let FEATURES_STORE: null | Store<FeaturesStore> = null;

export const getFeaturesStore = (): Store<FeaturesStore> => {
  if (FEATURES_STORE === null) {
    const defaultFeatures = parseFeatures({});
    FEATURES_STORE = new Store<FeaturesStore>({
      defaults: defaultFeatures,
      deserialize: (value) => {
        try {
          return parseFeatures(JSON.parse(value));
        } catch (error) {
          logger.error("Failed to parse features", error);
          return defaultFeatures;
        }
      },
      name: "features",
    });

    FEATURES_STORE.onDidAnyChange(() => {
      publisher.publish("features.updated", null);
    });
  }

  return FEATURES_STORE;
};

// export const isFeatureEnabled = (feature: FeatureName): boolean => {
//   const store = getFeaturesStore();
//   return store.get(feature);
// };
