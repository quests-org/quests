import { z } from "zod";

export const AIProviderTypeSchema = z.enum([
  "anthropic",
  "google",
  "ollama",
  "openai",
  "openrouter",
  "vercel",
]);
export type AIProviderType = z.infer<typeof AIProviderTypeSchema>;
