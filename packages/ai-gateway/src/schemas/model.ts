import { z } from "zod";

import { AIGatewayModelURI } from "./model-uri";

export namespace AIGatewayModel {
  export const ProviderIdSchema = z
    .string()
    .brand<"AIGatewayProviderModelId">();
  export type ProviderId = z.output<typeof ProviderIdSchema>;

  export const ModelTagSchema = z.enum([
    "coding",
    "default",
    "legacy",
    "recommended",
    "new",
  ]);
  export type ModelTag = z.output<typeof ModelTagSchema>;
  export const ModelFeaturesSchema = z.enum([
    "inputText",
    "outputText",
    "tools",
  ]);
  export type ModelFeatures = z.output<typeof ModelFeaturesSchema>;

  export const CanonicalIdSchema = AIGatewayModelURI.CanonicalIdSchema;
  export type CanonicalId = z.output<typeof CanonicalIdSchema>;

  export const Schema = z.object({
    author: z.string(),
    canonicalId: AIGatewayModelURI.CanonicalIdSchema,
    features: ModelFeaturesSchema.array(),
    name: z.string(),
    params: AIGatewayModelURI.ParamsSchema,
    providerId: ProviderIdSchema,
    providerName: z.string(),
    tags: ModelTagSchema.array(),
    uri: AIGatewayModelURI.Schema,
  });

  export type Type = z.output<typeof Schema>;
}
