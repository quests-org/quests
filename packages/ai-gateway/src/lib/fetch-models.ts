import { type CaptureExceptionFunction } from "@quests/shared";
import { Result } from "typescript-result";

import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { TypedError } from "./errors";
import { fetchAndParseAnthropicModels } from "./fetch-models/anthropic";
import { fetchAndParseGoogleModels } from "./fetch-models/google";
import { fetchAndParseOpenAIModels } from "./fetch-models/openai";
import { fetchAndParseOpenAICompatibleModels } from "./fetch-models/openai-compatible";
import { fetchModelsForOpenRouter } from "./fetch-models/openrouter";
import { fetchModelsForVercel } from "./fetch-models/vercel";

const capturedErrors = new Set<string>();

export function fetchModelsForProvider(
  config: AIGatewayProviderConfig.Type,
  { captureException }: { captureException: CaptureExceptionFunction },
) {
  return Result.fromAsyncCatching(
    async () => {
      switch (config.type) {
        case "anthropic": {
          return fetchAndParseAnthropicModels(config);
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
    },
    (error) => {
      return new TypedError.Unknown("Failed to fetch models for provider", {
        cause: error,
      });
    },
  ).onFailure((error) => {
    const captureKey = getCaptureKey(config, error);
    if (!capturedErrors.has(captureKey)) {
      capturedErrors.add(captureKey);
      captureException(error);
    }
  });
}

function getCaptureKey(config: AIGatewayProviderConfig.Type, error: Error) {
  return `${config.type}:${config.id}:${error.message}`;
}
