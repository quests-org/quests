import { type CaptureExceptionFunction } from "@quests/shared";
import { parallel } from "radashi";
import { Result } from "typescript-result";

import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { TypedError } from "./errors";
import { fetchModels } from "./models";
import { getProviderMetadata } from "./providers/metadata";

export async function fetchModelResultsForProviders(
  configs: AIGatewayProviderConfig.Type[],
  { captureException }: { captureException: CaptureExceptionFunction },
) {
  return await parallel(10, configs, (config) =>
    fetchModelsForProvider(config, { captureException }),
  );
}

export function fetchModelsForProvider(
  config: AIGatewayProviderConfig.Type,
  { captureException }: { captureException: CaptureExceptionFunction },
) {
  return Result.fromAsyncCatching(
    async () => {
      return await fetchModels(config, { captureException });
    },
    (error) => {
      captureException(error);
      return new TypedError.Unknown("Failed to fetch models for provider", {
        cause: error,
      });
    },
  ).mapError((error) => {
    const metadata = getProviderMetadata(config.type);
    return {
      config: {
        displayName: config.displayName || metadata.name,
        type: config.type,
      },
      message: error.message,
    };
  });
}

export async function fetchModelsForProviders(
  configs: AIGatewayProviderConfig.Type[],
  { captureException }: { captureException: CaptureExceptionFunction },
) {
  const modelsByProvider = await parallel(10, configs, (config) =>
    fetchModelsForProvider(config, { captureException }),
  );

  return modelsByProvider.flatMap((models) => models.getOrDefault([]));
}
