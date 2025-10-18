import { z } from "zod";

export const AIProviderTypeSchema = z.enum([
  "anthropic",
  "google",
  "ollama",
  "openai",
  "openai-compatible",
  "openrouter",
  "vercel",
]);
export type AIProviderType = z.infer<typeof AIProviderTypeSchema>;

export const AIProviderConfigIdSchema = z.string().brand("AIProviderConfigId");
export type AIProviderConfigId = z.output<typeof AIProviderConfigIdSchema>;

export const AIProviderConfigSubTypeSchema = z.enum([
  "anyscale",
  "deepinfra",
  "fireworks",
  "groq",
  "huggingface",
  "hyperbolic",
  "jan",
  "lmstudio",
  "localai",
  "mistral",
  "novita",
  "perplexity",
  "together",
  "z-ai",
]);
export type AIProviderConfigSubType = z.infer<
  typeof AIProviderConfigSubTypeSchema
>;
