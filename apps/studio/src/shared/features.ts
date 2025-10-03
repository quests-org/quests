import { z } from "zod";

export const FeatureNameSchema = z.enum([
  "createInNewTab",
  "evals",
  "questsAccounts",
]);
export type FeatureName = z.output<typeof FeatureNameSchema>;
