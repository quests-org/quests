import { type GatewayModelEntry } from "@ai-sdk/gateway";
import { z } from "zod";

import { AIGatewayModelURI } from "./model-uri";

export namespace AIGatewayModel {
  type InputModalities = "audio" | "file" | "image" | "text" | (string & {});
  type OutputModalities = "text" | (string & {});

  // Loose validation of just a string, but want inference for TypeScript
  const InputModalitySchema = z.custom<InputModalities>(
    (v) => typeof v === "string",
  );
  const OutputModalitySchema = z.custom<OutputModalities>(
    (v) => typeof v === "string",
  );

  export const OpenRouterSchema = z.object({
    architecture: z.object({
      input_modalities: InputModalitySchema.array(),
      instruct_type: z.string().nullish(),
      output_modalities: OutputModalitySchema.array(),
      tokenizer: z.string(),
    }),
    canonical_slug: z.string().nullish(),
    context_length: z.number().nullish(),
    created: z.number(),
    description: z.string(),
    hugging_face_id: z.string().nullish(),
    id: z.string(),
    name: z.string(),
    per_request_limits: z.record(z.string(), z.number()).nullish(),
    pricing: z.object({
      completion: z.string(),
      image: z.string().nullish(),
      input_cache_read: z.string().nullish(),
      input_cache_write: z.string().nullish(),
      internal_reasoning: z.string().nullish(),
      prompt: z.string(),
      request: z.string().nullish(),
      web_search: z.string().nullish(),
    }),
    supported_parameters: z.array(z.string()).nullish(),
    top_provider: z.object({
      context_length: z.number().nullish(),
      is_moderated: z.boolean(),
      max_completion_tokens: z.number().nullish(),
    }),
  });

  export const OpenAISchema = z.object({
    created: z.number().optional(),
    id: z.string(),
    object: z.string().optional(),
    owned_by: z.string().optional(),
  });

  export const OllamaSchema = OpenAISchema;

  export const AnthropicSchema = z.object({
    created_at: z.string().optional(),
    display_name: z.string().optional(),
    id: z.string(),
    type: z.string().optional(),
  });

  export const GoogleSchema = z.object({
    description: z.string().optional(),
    displayName: z.string(),
    inputTokenLimit: z.number(),
    maxTemperature: z.number().optional(),
    name: z.string(),
    outputTokenLimit: z.number(),
    supportedGenerationMethods: z.array(z.string()),
    temperature: z.number().optional(),
    thinking: z.boolean().optional(),
    topK: z.number().optional(),
    topP: z.number().optional(),
    version: z.string(),
  });

  export const VercelSchema = z.custom<GatewayModelEntry>();

  export const SourceSchema = z.discriminatedUnion("providerType", [
    z.object({ providerType: z.literal("anthropic"), value: AnthropicSchema }),
    z.object({ providerType: z.literal("openai"), value: OpenAISchema }),
    z.object({ providerType: z.literal("google"), value: GoogleSchema }),
    z.object({ providerType: z.literal("vercel"), value: VercelSchema }),
    z.object({
      providerType: z.literal("openrouter"),
      value: OpenRouterSchema,
    }),
    z.object({ providerType: z.literal("ollama"), value: OllamaSchema }),
    z.object({
      providerType: z.literal("openai-compatible"),
      value: OpenAISchema,
    }),
  ]);

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
    source: SourceSchema,
    tags: ModelTagSchema.array(),
    uri: AIGatewayModelURI.Schema,
  });

  export type Type = z.output<typeof Schema>;
}
