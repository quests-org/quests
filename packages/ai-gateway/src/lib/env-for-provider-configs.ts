import { type WorkspaceServerURL } from "@quests/shared";

import { DEFAULT_OPENAI_MODEL } from "../constants";
import { internalAPIKey } from "../lib/key-for-provider";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { apiBaseURL } from "./api-base-url";
import { isOpenAICompatible } from "./providers/is-openai-compatible";

export function envForProviderConfigs({
  configs,
  workspaceServerURL,
}: {
  configs: AIGatewayProviderConfig.Type[];
  workspaceServerURL: WorkspaceServerURL;
}) {
  const env: Record<string, string> = {};

  for (const config of configs) {
    switch (config.type) {
      case "anthropic": {
        env.ANTHROPIC_API_KEY = internalAPIKey();
        env.ANTHROPIC_BASE_URL = apiBaseURL({
          type: config.type,
          workspaceServerURL,
        });
        break;
      }
      case "google": {
        // For @google/genai
        env.GEMINI_API_KEY = internalAPIKey();
        env.GEMINI_BASE_URL = apiBaseURL({
          type: config.type,
          workspaceServerURL,
        });
        // For @ai-sdk/google
        env.GOOGLE_GENERATIVE_AI_API_KEY = internalAPIKey();
        env.GOOGLE_GENERATIVE_AI_BASE_URL = apiBaseURL({
          type: config.type,
          workspaceServerURL,
        });
        break;
      }
      case "ollama": {
        env.OLLAMA_API_KEY = internalAPIKey();
        env.OLLAMA_BASE_URL = apiBaseURL({
          type: config.type,
          workspaceServerURL,
        });
        break;
      }
      case "openai": {
        env.OPENAI_API_KEY = internalAPIKey();
        env.OPENAI_BASE_URL = apiBaseURL({
          type: config.type,
          workspaceServerURL,
        });
        break;
      }
      case "openrouter": {
        env.OPENROUTER_API_KEY = internalAPIKey();
        env.OPENROUTER_BASE_URL = apiBaseURL({
          type: config.type,
          workspaceServerURL,
        });
        break;
      }
      case "vercel": {
        env.AI_GATEWAY_API_KEY = internalAPIKey();
        env.AI_GATEWAY_BASE_URL = apiBaseURL({
          type: config.type,
          workspaceServerURL,
        });
        break;
      }
    }
  }

  const openAICompatibleConfig = configs.find((config) =>
    isOpenAICompatible(config.type),
  );
  if (openAICompatibleConfig) {
    env.OPENAI_DEFAULT_MODEL = DEFAULT_OPENAI_MODEL;
    const hasNonOpenAICompatibleConfig = configs.some(
      (config) => config.type !== "openai" && isOpenAICompatible(config.type),
    );
    if (hasNonOpenAICompatibleConfig) {
      env.OPENAI_API_KEY = internalAPIKey();
      env.OPENAI_BASE_URL = apiBaseURL({
        type: "openai-compatible",
        workspaceServerURL,
      });
    }
  }

  return env;
}
