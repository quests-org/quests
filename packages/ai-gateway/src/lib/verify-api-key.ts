import { type AsyncResult, Result } from "typescript-result";

import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { TypedError } from "./errors";
import { apiURL } from "./providers/api-url";
import { baseURLWithDefault } from "./providers/base-url-with-default";
import { getProviderMetadata } from "./providers/metadata";
import { openAICompatibleURL } from "./providers/openai-compatible-url";
import { setProviderAuthHeaders } from "./providers/set-auth-headers";

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
        const headers = new Headers({ "Content-Type": "application/json" });
        setProviderAuthHeaders(headers, config);
        const url = apiURL({ config, path: "/credits" });

        return Result.try(
          async () => {
            const response = await fetch(url, { headers });
            if (!response.ok) {
              throw new Error("Failed to fetch credits");
            }
            return true;
          },
          (error) =>
            new TypedError.VerificationFailed("Failed to verify API key", {
              cause: error,
            }),
        );
      });
    }

    case "z-ai": {
      return verifyWithModelsEndpoint({
        config,
        errorMessage: `Failed to verify API key for ${metadata.name}`,
        path: "/models",
      });
    }

    default: {
      return verifyWithModelsEndpoint({
        config,
        errorMessage: `Failed to verify API key for ${metadata.name}`,
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
  path?: `/${string}`;
}): AsyncResult<boolean, TypedError.VerificationFailed> {
  return Result.fromAsync(async () => {
    const headers = new Headers({ "Content-Type": "application/json" });
    setProviderAuthHeaders(headers, config);
    const url = openAICompatibleURL({
      config,
      path: "/models",
    });

    return Result.try(
      async () => {
        const response = await fetch(url, { headers });
        if (!response.ok) {
          throw new Error("API key verification failed");
        }
        return true;
      },
      (error) =>
        new TypedError.VerificationFailed(errorMessage, { cause: error }),
    );
  });
}
