import { z } from "zod";

export const FeatureNameSchema = z.enum(["na"]);
export type FeatureName = z.output<typeof FeatureNameSchema>;

export const FeaturesSchema = z.record(FeatureNameSchema, z.boolean());

export type Features = z.output<typeof FeaturesSchema>;

export const FEATURE_METADATA: Record<
  FeatureName,
  { description: string; title: string }
> = {
  na: {
    description: "Not yet implemented",
    title: "N/A",
  },
};
