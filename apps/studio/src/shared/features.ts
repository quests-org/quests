const features: Record<"questsAccounts", boolean> = {
  questsAccounts: false,
};

type FeatureKey = keyof typeof features;

export const isFeatureEnabled = (key: FeatureKey) => features[key];
