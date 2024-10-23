import { AI_GATEWAY_API_PATH } from "@quests/shared";

import { type AIGatewayProvider } from "../schemas/provider";

export const PROVIDER_PATH: Record<AIGatewayProvider.Type["type"], string> = {
  anthropic: "/anthropic",
  google: "/google",
  ollama: "/ollama",
  openai: "/openai",
  openrouter: "/openrouter",
  vercel: "/vercel",
};

// Full path used by apps server to proxy requests to providers
export const PROVIDER_API_PATH: Record<AIGatewayProvider.Type["type"], string> =
  {
    anthropic: `${AI_GATEWAY_API_PATH}${PROVIDER_PATH.anthropic}`,
    google: `${AI_GATEWAY_API_PATH}${PROVIDER_PATH.google}`,
    ollama: `${AI_GATEWAY_API_PATH}${PROVIDER_PATH.ollama}`,
    openai: `${AI_GATEWAY_API_PATH}${PROVIDER_PATH.openai}`,
    openrouter: `${AI_GATEWAY_API_PATH}${PROVIDER_PATH.openrouter}`,
    vercel: `${AI_GATEWAY_API_PATH}${PROVIDER_PATH.vercel}`,
  };
