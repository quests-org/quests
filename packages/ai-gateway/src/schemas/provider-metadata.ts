import { AIProviderTypeSchema } from "@quests/shared";
import { z } from "zod";

const ProviderTagsSchema = z.enum([
  "imageGeneration",
  "recommended",
  "webSearch",
]);

export const ProviderMetadataSchema = z.object({
  api: z.object({
    // Usually this is the OpenAI API compatible URL, but sometimes it's the raw
    // API URL if they have their own API that expects a different path.
    // If that's the case, then openai-compatible-url.ts handles the mapping.
    defaultBaseURL: z.string(),
    keyFormat: z.string().optional(),
    keyURL: z.string().optional(),
  }),
  canAddManually: z.boolean().optional().default(true).meta({
    description:
      "Whether the provider can be added manually (usually via API key) by the user",
  }),
  description: z.string(),
  name: z.string(),
  requiresAPIKey: z.boolean().optional().default(true),
  tags: z.array(ProviderTagsSchema).optional().default([]),
  type: AIProviderTypeSchema,
  url: z.string(),
});

export type ProviderMetadata = z.output<typeof ProviderMetadataSchema>;
export type ProviderMetadataInput = z.input<typeof ProviderMetadataSchema>;
