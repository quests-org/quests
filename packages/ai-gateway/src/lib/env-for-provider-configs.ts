import { AI_GATEWAY_API_PATH, type WorkspaceServerURL } from "@quests/shared";

import {
  DEFAULT_OPENAI_MODEL,
  OPENAI_COMPATIBLE_PATH,
  PROVIDERS_PATH,
} from "../constants";
import { internalAPIKey } from "../lib/key-for-provider";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { internalURL } from "./internal-url";
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
        env.ANTHROPIC_BASE_URL = internalURL({
          config,
          workspaceServerURL,
        });
        break;
      }
      case "cerebras": {
        env.CEREBRAS_API_KEY = internalAPIKey();
        env.CEREBRAS_BASE_URL = internalURL({
          config,
          workspaceServerURL,
        });
        break;
      }
      case "deepinfra": {
        env.DEEPINFRA_API_KEY = internalAPIKey();
        env.DEEPINFRA_BASE_URL = internalURL({
          config,
          workspaceServerURL,
        });
        break;
      }
      case "deepseek": {
        env.DEEPSEEK_API_KEY = internalAPIKey();
        env.DEEPSEEK_BASE_URL = internalURL({
          config,
          workspaceServerURL,
        });
        break;
      }
      case "fireworks": {
        env.FIREWORKS_API_KEY = internalAPIKey();
        env.FIREWORKS_BASE_URL = internalURL({
          config,
          workspaceServerURL,
        });
        break;
      }
      case "google": {
        // For @google/genai
        env.GEMINI_API_KEY = internalAPIKey();
        env.GEMINI_BASE_URL = internalURL({
          config,
          workspaceServerURL,
        });
        // For @ai-sdk/google
        env.GOOGLE_GENERATIVE_AI_API_KEY = internalAPIKey();
        env.GOOGLE_GENERATIVE_AI_BASE_URL = internalURL({
          config,
          workspaceServerURL,
        });
        break;
      }
      case "groq": {
        env.GROQ_API_KEY = internalAPIKey();
        env.GROQ_BASE_URL = internalURL({
          config,
          workspaceServerURL,
        });
        break;
      }
      case "mistral": {
        env.MISTRAL_API_KEY = internalAPIKey();
        env.MISTRAL_BASE_URL = internalURL({
          config,
          workspaceServerURL,
        });
        break;
      }
      case "ollama": {
        env.OLLAMA_API_KEY = internalAPIKey();
        env.OLLAMA_BASE_URL = internalURL({
          config,
          workspaceServerURL,
        });
        break;
      }
      case "openai": {
        env.OPENAI_API_KEY = internalAPIKey();
        env.OPENAI_BASE_URL = internalURL({
          config,
          workspaceServerURL,
        });
        break;
      }
      case "openrouter": {
        env.OPENROUTER_API_KEY = internalAPIKey();
        env.OPENROUTER_BASE_URL = internalURL({
          config,
          workspaceServerURL,
        });
        break;
      }
      case "perplexity": {
        env.PERPLEXITY_API_KEY = internalAPIKey();
        env.PERPLEXITY_BASE_URL = internalURL({
          config,
          workspaceServerURL,
        });
        break;
      }
      case "together": {
        env.TOGETHER_AI_API_KEY = internalAPIKey();
        env.TOGETHER_AI_BASE_URL = internalURL({
          config,
          workspaceServerURL,
        });
        break;
      }
      case "vercel": {
        env.AI_GATEWAY_API_KEY = internalAPIKey();
        env.AI_GATEWAY_BASE_URL = internalURL({
          config,
          workspaceServerURL,
        });
        break;
      }
      case "x-ai": {
        env.XAI_API_KEY = internalAPIKey();
        env.XAI_BASE_URL = internalURL({
          config,
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
      env.OPENAI_BASE_URL = [
        workspaceServerURL,
        AI_GATEWAY_API_PATH,
        PROVIDERS_PATH,
        OPENAI_COMPATIBLE_PATH,
      ].join("");
    }
  }

  return env;
}
