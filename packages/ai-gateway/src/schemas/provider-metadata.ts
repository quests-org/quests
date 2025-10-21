import { AIProviderTypeSchema } from "@quests/shared";
import { z } from "zod";

export const ProviderMetadataSchema = z.object({
  api: z.object({
    // Usually this is the OpenAI API compatible URL, but sometimes it's the raw
    // API URL if they have their own API that expects a different path.
    // If that's the case, then openai-compatible-url.ts handles the mapping.
    defaultBaseURL: z.string(),
    keyFormat: z.string().optional(),
    keyURL: z.string().optional(),
  }),
  description: z.string(),
  name: z.string(),
  requiresAPIKey: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().default([]),
  type: AIProviderTypeSchema,
  url: z.string(),
});

export type ProviderMetadata = z.output<typeof ProviderMetadataSchema>;
export type ProviderMetadataInput = z.input<typeof ProviderMetadataSchema>;
