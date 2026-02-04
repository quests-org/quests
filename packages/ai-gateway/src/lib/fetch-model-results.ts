import { type CaptureExceptionFunction } from "@quests/shared";
import { parallel } from "radashi";

import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { fetchModelsForProvider } from "./fetch-models";
import { getProviderMetadata } from "./providers/metadata";

export async function fetchModelResultsForProviders(
  configs: AIGatewayProviderConfig.Type[],
  { captureException }: { captureException: CaptureExceptionFunction },
) {
  return await parallel(10, configs, (config) =>
    fetchModelsForProvider(config, { captureException }).mapError((error) => {
      const metadata = getProviderMetadata(config.type);
      return {
        config: {
          displayName: config.displayName || metadata.name,
          type: config.type,
        },
        message:
          error.type === "gateway-fetch-error"
            ? `Failed to fetch models for ${config.displayName ?? metadata.name}`
            : error.message,
      };
    }),
  );
}
