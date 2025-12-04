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
            `Please enter a base URL for ${metadata.name}`,
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
            `Unable to verify ${metadata.name} API key`,
            { cause: result.error },
          ),
        );
      });
    }

    default: {
      return verifyWithModelsEndpoint({
        config,
        errorMessage: `Unable to verify ${metadata.name} API key`,
      });
    }
  }
}

function verifyWithModelsEndpoint({
  config,
  errorMessage = "Unable to verify API key",
}: {
  config: VerifyConfig;
  errorMessage?: string;
}): AsyncResult<boolean, TypedError.VerificationFailed> {
  return Result.fromAsync(async () => {
    let result;
    switch (config.type) {
      case "anthropic": {
        result = await fetchAnthropicModels(config, { cache: false });
        break;
      }
      case "google": {
        result = await fetchGoogleModels(config, { cache: false });
        break;
      }
      case "openai": {
        result = await fetchOpenAIModels(config, { cache: false });
        break;
      }
      default: {
        result = await fetchOpenAICompatibleModels(config, { cache: false });
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
