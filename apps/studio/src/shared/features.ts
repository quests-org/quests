import { z } from "zod";

export const FeatureNameSchema = z.enum(["browser"]);
export type FeatureName = z.output<typeof FeatureNameSchema>;

export const FeaturesSchema = z.record(FeatureNameSchema, z.boolean());

export type Features = z.output<typeof FeaturesSchema>;

export const FEATURE_METADATA: Record<
  FeatureName,
  { description: string; title: string }
> = {
  browser: {
    description: "Enable the browser page and sidebar item.",
    title: "Browser",
  },
};
