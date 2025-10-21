import { z } from "zod";

export const AIProviderTypeSchema = z.enum([
  "anthropic",
  "anyscale",
  "cerebras",
  "deepinfra",
  "fireworks",
  "google",
  "groq",
  "huggingface",
  "hyperbolic",
  "jan",
  "lmstudio",
  "localai",
  "mistral",
  "novita",
  "ollama",
  "ollama",
  "openai",
  "openai-compatible",
  "openrouter",
  "perplexity",
  "together",
  "vercel",
  "x-ai",
  "z-ai",
]);
export type AIProviderType = z.infer<typeof AIProviderTypeSchema>;

export const AIProviderConfigIdSchema = z.string().brand("AIProviderConfigId");
export type AIProviderConfigId = z.output<typeof AIProviderConfigIdSchema>;
