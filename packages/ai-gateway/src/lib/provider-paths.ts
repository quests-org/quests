import { AI_GATEWAY_API_PATH } from "@quests/shared";

import { type AIGatewayProviderConfig } from "../schemas/provider-config";

export const PROVIDER_PATH: Record<
  AIGatewayProviderConfig.Type["type"],
  string
> = {
  anthropic: "/anthropic",
  google: "/google",
  ollama: "/ollama",
  openai: "/openai",
  "openai-compatible": "/openai-compatible",
  openrouter: "/openrouter",
  vercel: "/vercel",
};

// Full path used by workspace server to proxy requests to providers
export const PROVIDER_API_PATH: Record<
  AIGatewayProviderConfig.Type["type"],
  string
> = {
  anthropic: `${AI_GATEWAY_API_PATH}${PROVIDER_PATH.anthropic}`,
  google: `${AI_GATEWAY_API_PATH}${PROVIDER_PATH.google}`,
  ollama: `${AI_GATEWAY_API_PATH}${PROVIDER_PATH.ollama}`,
  openai: `${AI_GATEWAY_API_PATH}${PROVIDER_PATH.openai}`,
  "openai-compatible": `${AI_GATEWAY_API_PATH}${PROVIDER_PATH["openai-compatible"]}`,
  openrouter: `${AI_GATEWAY_API_PATH}${PROVIDER_PATH.openrouter}`,
  vercel: `${AI_GATEWAY_API_PATH}${PROVIDER_PATH.vercel}`,
};
