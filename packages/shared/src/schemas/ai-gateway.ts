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

export const AIProviderConfigIdSchema = z
  .custom<"quests" | (string & {})>((val) => typeof val === "string")
  .brand("AIProviderConfigId");
export type AIProviderConfigId = z.output<typeof AIProviderConfigIdSchema>;
