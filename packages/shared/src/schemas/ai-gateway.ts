import { z } from "zod";

export const AIProviderTypeSchema = z.enum([
  "anthropic",
  "anyscale",
  "cerebras",
  "deepinfra",
  "deepseek",
  "fireworks",
  "minimax",
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
  "openai-compatible",
  "openai",
  "openrouter",
  "perplexity",
  "quests",
  "together",
  "vercel",
  "x-ai",
  "z-ai",
]);
export type AIProviderType = z.infer<typeof AIProviderTypeSchema>;

// Quests is a special case and only has one config ID that correlates to the
// logged in user.
export const AIProviderConfigIdSchema = z.custom<
  "quests" | (string & z.$brand<"AIProviderConfigId">)
>((val) => typeof val === "string");
export type AIProviderConfigId = z.output<typeof AIProviderConfigIdSchema>;
