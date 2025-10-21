import { type CaptureExceptionFunction } from "@quests/shared";

import { type AIGatewayProviderConfig } from "../../schemas/provider-config";
import { fetchModelsForAnthropic } from "./anthropic";
import { fetchModelsForGoogle } from "./google";
import { fetchModelsForOpenAI } from "./openai";
import { fetchModelsForOpenAICompatible } from "./openai-compatible";
import { fetchModelsForOpenRouter } from "./openrouter";
import { fetchModelsForVercel } from "./vercel";

export function fetchModels(
  config: AIGatewayProviderConfig.Type,
  options: { captureException: CaptureExceptionFunction },
) {
  switch (config.type) {
    case "anthropic": {
      return fetchModelsForAnthropic(config, {
        captureException: options.captureException,
      });
    }
    case "google": {
      return fetchModelsForGoogle(config);
    }
    case "openai": {
      return fetchModelsForOpenAI(config);
    }
    case "openrouter": {
      return fetchModelsForOpenRouter(config);
    }
    case "vercel": {
      return fetchModelsForVercel(config);
    }
    default: {
      return fetchModelsForOpenAICompatible(config);
    }
  }
}
