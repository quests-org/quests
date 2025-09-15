import { type AIGatewayProvider } from "@quests/ai-gateway";
import { sort } from "radashi";

const UTM_SOURCE = "quests.dev";
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
    apiKeyURL: `https://console.anthropic.com/account/keys?${UTM_SOURCE}`,
    description: "Sonnet, Opus, and other Anthropic models",
    name: "Anthropic",
    tags: [],
    url: `https://anthropic.com?${UTM_SOURCE}`,
  }),
  google: createProviderMetadata("google", {
    apiKeyFormat: "AI",
    apiKeyURL: `https://aistudio.google.com/app/apikey?${UTM_SOURCE}`,
    description: "Gemini and other Google models",
    name: "Google",
    tags: ["Free tier"],
    url: `https://ai.google.dev/?${UTM_SOURCE}`,
  }),
  ollama: createProviderMetadata("ollama", {
    description: "Run local models on your own machine",
    name: "Ollama",
    requiresAPIKey: false,
    tags: [],
    url: `https://ollama.com?${UTM_SOURCE}`,
  }),
  openai: createProviderMetadata("openai", {
    apiKeyFormat: "sk-",
    apiKeyURL: `https://platform.openai.com/account/api-keys?${UTM_SOURCE}`,
    description: "GPT-5 and other OpenAI models",
    name: "OpenAI",
    tags: [],
    url: `https://openai.com?${UTM_SOURCE}`,
  }),
  openrouter: createProviderMetadata("openrouter", {
    apiKeyFormat: "sk-or-",
    apiKeyURL: `https://openrouter.ai?${UTM_SOURCE}`,
    description: "Access an extensive catalog of models across providers",
    name: "OpenRouter",
    tags: [RECOMMENDED_TAG, "Free models"],
    url: `https://openrouter.ai?${UTM_SOURCE}`,
  }),
  vercel: createProviderMetadata("vercel", {
    apiKeyFormat: "vck_",
    apiKeyURL: `https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys%3Futm_source%3D${UTM_SOURCE}&title=Get+an+API+Key`,
    description: "Access hundreds of models across many providers",
    name: "Vercel AI Gateway",
    tags: ["$5 free credit with card"],
    url: `https://vercel.com/ai-gateway?utm_source=${UTM_SOURCE}`,
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
