import { type CaptureExceptionFunction } from "@quests/shared";

import { type AIGatewayProviderConfig } from "../../schemas/provider-config";
import { fetchAndParseAnthropicModels } from "./anthropic";
import { fetchAndParseGoogleModels } from "./google";
import { fetchAndParseOpenAIModels } from "./openai";
import { fetchAndParseOpenAICompatibleModels } from "./openai-compatible";
import { fetchModelsForOpenRouter } from "./openrouter";
import { fetchModelsForVercel } from "./vercel";

export function fetchModels(
  config: AIGatewayProviderConfig.Type,
  options: { captureException: CaptureExceptionFunction },
) {
  switch (config.type) {
    case "anthropic": {
      return fetchAndParseAnthropicModels(config, {
        captureException: options.captureException,
      });
    }
    case "google": {
      return fetchAndParseGoogleModels(config);
    }
    case "openai": {
      return fetchAndParseOpenAIModels(config);
    }
    case "openrouter":
    case "quests": {
      return fetchModelsForOpenRouter(config);
    }
    case "vercel": {
      return fetchModelsForVercel(config);
    }
    default: {
      return fetchAndParseOpenAICompatibleModels(config);
    }
  }
}
