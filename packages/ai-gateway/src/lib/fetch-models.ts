import { type CaptureExceptionFunction } from "@quests/shared";
import { parallel } from "radashi";
import { Result } from "typescript-result";

import { getProviderAdapter } from "../adapters/all";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { TypedError } from "./errors";

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
      const adapter = getProviderAdapter(config.type);
      return await adapter.fetchModels(config, { captureException });
    },
    (error) => {
      captureException(error);
      return new TypedError.Unknown("Failed to fetch models for provider", {
        cause: error,
      });
    },
  );
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
