import { type CaptureExceptionFunction } from "@quests/shared";
import { parallel } from "radashi";

import { getProviderAdapter } from "../adapters/all";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";

export async function fetchModelResultsForProviders(
  configs: AIGatewayProviderConfig.Type[],
  { captureException }: { captureException: CaptureExceptionFunction },
) {
  return await parallel(10, configs, (config) =>
    fetchModelsForProvider(config, { captureException }),
  );
}

export async function fetchModelsForProvider(
  config: AIGatewayProviderConfig.Type,
  { captureException }: { captureException: CaptureExceptionFunction },
) {
  const adapter = getProviderAdapter(config.type);
  return await adapter.fetchModels(config, { captureException });
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
