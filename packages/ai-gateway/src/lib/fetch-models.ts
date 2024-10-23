import { type CaptureExceptionFunction } from "@quests/shared";
import { parallel } from "radashi";

import { getProviderAdapter } from "../adapters/all";
import { type AIGatewayProvider } from "../schemas/provider";

export async function fetchModelResultsForProviders(
  providers: AIGatewayProvider.Type[],
  { captureException }: { captureException: CaptureExceptionFunction },
) {
  return await parallel(10, providers, (provider) =>
    fetchModelsForProvider(provider, { captureException }),
  );
}

export async function fetchModelsForProvider(
  provider: AIGatewayProvider.Type,
  { captureException }: { captureException: CaptureExceptionFunction },
) {
  const adapter = getProviderAdapter(provider.type);
  return await adapter.fetchModels(provider, { captureException });
}

export async function fetchModelsForProviders(
  providers: AIGatewayProvider.Type[],
  { captureException }: { captureException: CaptureExceptionFunction },
) {
  const modelsByProvider = await parallel(10, providers, (provider) =>
    fetchModelsForProvider(provider, { captureException }),
  );

  return modelsByProvider.flatMap((models) => models.getOrDefault([]));
}
