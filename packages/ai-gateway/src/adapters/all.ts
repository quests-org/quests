import { type AIProviderType } from "@quests/shared";

import { anthropicAdapter } from "./anthropic";
import { googleAdapter } from "./google";
import { ollamaAdapter } from "./ollama";
import { openaiAdapter } from "./openai";
import { openaiCompatibleAdapter } from "./openai-compatible";
import { openrouterAdapter } from "./openrouter";
import { type ProviderAdapter } from "./setup";
import { vercelAdapter } from "./vercel";

const PROVIDER_ADAPTERS: Record<AIProviderType, ProviderAdapter> = {
  anthropic: anthropicAdapter,
  google: googleAdapter,
  ollama: ollamaAdapter,
  openai: openaiAdapter,
  "openai-compatible": openaiCompatibleAdapter,
  openrouter: openrouterAdapter,
  vercel: vercelAdapter,
};

export const ALL_PROVIDER_ADAPTERS = Object.values(PROVIDER_ADAPTERS);

export function getAllProviderAdapters() {
  return ALL_PROVIDER_ADAPTERS;
}

export function getProviderAdapter(
  providerType: AIProviderType,
): ProviderAdapter {
  return PROVIDER_ADAPTERS[providerType];
}
