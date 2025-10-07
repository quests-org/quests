import { type AIGatewayProvider } from "../schemas/provider";
import { anthropicAdapter } from "./anthropic";
import { googleAdapter } from "./google";
import { ollamaAdapter } from "./ollama";
import { openaiAdapter } from "./openai";
import { openrouterAdapter } from "./openrouter";
import { type ProviderAdapter } from "./setup";
import { vercelAdapter } from "./vercel";

const PROVIDER_ADAPTERS: Record<
  AIGatewayProvider.Type["type"],
  ProviderAdapter
> = {
  anthropic: anthropicAdapter,
  google: googleAdapter,
  ollama: ollamaAdapter,
  openai: openaiAdapter,
  openrouter: openrouterAdapter,
  vercel: vercelAdapter,
};

export const ALL_PROVIDER_ADAPTERS = Object.values(PROVIDER_ADAPTERS);

export function getAllProviderAdapters() {
  return ALL_PROVIDER_ADAPTERS;
}

export function getProviderAdapter(
  providerType: AIGatewayProvider.Type["type"],
): ProviderAdapter {
  return PROVIDER_ADAPTERS[providerType];
}
