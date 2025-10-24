import { type AsyncResult, Result } from "typescript-result";

import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { TypedError } from "./errors";
import { fetchAnthropicModels } from "./models/anthropic";
import { fetchGoogleModels } from "./models/google";
import { fetchOpenAIModels } from "./models/openai";
import { fetchOpenAICompatibleModels } from "./models/openai-compatible";
import { baseURLWithDefault } from "./providers/base-url-with-default";
import { fetchCredits } from "./providers/fetch-credits";
import { getProviderMetadata } from "./providers/metadata";

type VerifyConfig = Pick<
  AIGatewayProviderConfig.Type,
  "apiKey" | "baseURL" | "type"
>;

export function verifyAPIKey(
  config: VerifyConfig,
): AsyncResult<boolean, TypedError.VerificationFailed> {
  const metadata = getProviderMetadata(config.type);
  const baseURL = baseURLWithDefault(config);

  if (!baseURL) {
    return Result.fromAsync(() =>
      Promise.resolve(
        Result.error(
          new TypedError.VerificationFailed(
            `Base URL is required for ${config.type} provider`,
          ),
        ),
      ),
    );
  }

  switch (config.type) {
    case "jan":
    case "lmstudio":
    case "localai":
    case "ollama": {
      return verifyWithModelsEndpoint({
        config,
        errorMessage: `${metadata.name} doesn't appear to be running`,
      });
    }

    case "openrouter": {
      return Result.fromAsync(async () => {
        const result = await fetchCredits(config);
        if (result.ok) {
          return Result.ok(true);
        }
        return Result.error(
          new TypedError.VerificationFailed(
            `Failed to verify API key for ${config.type} provider`,
            { cause: result.error },
          ),
        );
      });
    }

    default: {
      return verifyWithModelsEndpoint({
        config,
        errorMessage: `Failed to verify API key for ${metadata.name} (${config.type})`,
      });
    }
  }
}

function verifyWithModelsEndpoint({
  config,
  errorMessage = "Failed to verify API key",
}: {
  config: VerifyConfig;
  errorMessage?: string;
}): AsyncResult<boolean, TypedError.VerificationFailed> {
  return Result.fromAsync(async () => {
    let result;
    switch (config.type) {
      case "anthropic": {
        result = await fetchAnthropicModels(config);
        break;
      }
      case "google": {
        result = await fetchGoogleModels(config);
        break;
      }
      case "openai": {
        result = await fetchOpenAIModels(config);
        break;
      }
      default: {
        result = await fetchOpenAICompatibleModels(config);
        break;
      }
    }

    if (result.ok) {
      return Result.ok(true);
    }
    return Result.error(
      new TypedError.VerificationFailed(errorMessage, { cause: result.error }),
    );
  });
}
