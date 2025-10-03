type FEATURE_NAMES = "evals" | "questsAccounts";

const FEATURES: Record<FEATURE_NAMES, boolean> = {
  evals: process.env.NODE_ENV === "development", // For now, switch to json file later
  questsAccounts: false,
};

type FeatureKey = keyof typeof FEATURES;

export const isFeatureEnabled = (key: FeatureKey) => FEATURES[key];
