import { z } from "zod";

export const FeatureNameSchema = z.enum(["evals", "questsAccounts"]);
export type FeatureName = z.output<typeof FeatureNameSchema>;
