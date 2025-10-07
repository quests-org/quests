import { AIProviderTypeSchema } from "@quests/shared";
import { z } from "zod";

export const ProviderMetadataSchema = z.object({
  api: z.object({
    defaultBaseURL: z.string(),
    keyFormat: z.string().optional(),
    keyURL: z.string().optional(),
  }),
  description: z.string(),
  name: z.string(),
  requiresAPIKey: z.boolean(),
  tags: z.array(z.string()),
  url: z.string(),
});

export const ProviderMetadataWithTypeSchema = ProviderMetadataSchema.extend({
  type: AIProviderTypeSchema,
});

export type ProviderMetadata = z.output<typeof ProviderMetadataSchema>;
export type ProviderMetadataWithType = z.output<
  typeof ProviderMetadataWithTypeSchema
>;
