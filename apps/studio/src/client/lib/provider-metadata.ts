import { type AIGatewayProvider } from "@quests/ai-gateway";
import { sort } from "radashi";

import { addRef, REF_PARAM_KEY, REF_PARAM_VALUE } from "./add-ref";

export const RECOMMENDED_TAG = "Recommended";

interface ProviderMetadata<T extends AIGatewayProvider.Type["type"]> {
  apiKeyFormat?: string;
  apiKeyURL?: string;
  description: string;
  name: string;
  requiresAPIKey: boolean;
  tags: string[];
  type: T;
  url: string;
}

function createProviderMetadata<T extends AIGatewayProvider.Type["type"]>(
  type: T,
  metadata: Omit<ProviderMetadata<T>, "requiresAPIKey" | "type"> & {
    requiresAPIKey?: boolean;
  },
): ProviderMetadata<T> {
  return { ...metadata, requiresAPIKey: metadata.requiresAPIKey ?? true, type };
}

const PROVIDER_MAP: {
  [K in AIGatewayProvider.Type["type"]]: ProviderMetadata<K>;
} = {
  anthropic: createProviderMetadata("anthropic", {
    apiKeyFormat: "sk-ant-",
    apiKeyURL: addRef("https://console.anthropic.com/account/keys"),
    description: "Sonnet, Opus, and other Anthropic models",
    name: "Anthropic",
    tags: [],
    url: addRef("https://anthropic.com"),
  }),
  google: createProviderMetadata("google", {
    apiKeyFormat: "AI",
    apiKeyURL: addRef("https://aistudio.google.com/app/apikey"),
    description: "Gemini and other Google models",
    name: "Google",
    tags: ["Free tier"],
    url: addRef("https://ai.google.dev/"),
  }),
  ollama: createProviderMetadata("ollama", {
    description: "Run local models on your own machine",
    name: "Ollama",
    requiresAPIKey: false,
    tags: [],
    url: addRef("https://docs.ollama.com"),
  }),
  openai: createProviderMetadata("openai", {
    apiKeyFormat: "sk-",
    apiKeyURL: addRef("https://platform.openai.com/account/api-keys"),
    description: "GPT-5 and other OpenAI models",
    name: "OpenAI",
    tags: [],
    url: addRef("https://openai.com"),
  }),
  openrouter: createProviderMetadata("openrouter", {
    apiKeyFormat: "sk-or-",
    apiKeyURL: addRef("https://openrouter.ai"),
    description: "Access an extensive catalog of models across providers",
    name: "OpenRouter",
    tags: [RECOMMENDED_TAG, "Free models"],
    url: addRef("https://openrouter.ai"),
  }),
  vercel: createProviderMetadata("vercel", {
    apiKeyFormat: "vck_",
    apiKeyURL: `https://vercel.com/d?to=${encodeURIComponent(`/[team]/~/ai/api-keys?${REF_PARAM_KEY}=${REF_PARAM_VALUE}`)}&title=${encodeURIComponent("Get an API Key")}`,
    description: "Access hundreds of models across many providers",
    name: "Vercel AI Gateway",
    tags: ["$5 free credit with card"],
    url: addRef("https://vercel.com/ai-gateway"),
  }),
};

export const ALL_PROVIDERS = Object.values(PROVIDER_MAP);
export const SORTED_PROVIDERS = sort(
  ALL_PROVIDERS,
  (provider) => Number(provider.tags.includes(RECOMMENDED_TAG)),
  true,
);

export function getProviderMetadata(type: AIGatewayProvider.Type["type"]) {
  return PROVIDER_MAP[type];
}
