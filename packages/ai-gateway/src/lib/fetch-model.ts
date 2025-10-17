import { type CaptureExceptionFunction } from "@quests/shared";
import { Result } from "typescript-result";

import { getProviderAdapter } from "../adapters/all";
import { type AIGatewayModel } from "../schemas/model";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { TypedError } from "./errors";
import { fetchModelsForProviders } from "./fetch-models";
import { findModelByString } from "./find-model-by-string";
import { parseModelURI } from "./parse-model-uri";

export async function fetchModelByString(
  {
    configs,
    id,
  }: {
    configs: AIGatewayProviderConfig.Type[];
    id: string;
  },
  { captureException }: { captureException: CaptureExceptionFunction },
) {
  const allModels = await fetchModelsForProviders(configs, {
    captureException,
  });

  return findModelByString(id, allModels).model;
}

export async function fetchModelByURI(
  modelURI: AIGatewayModel.URI,
  configs: AIGatewayProviderConfig.Type[],
  { captureException }: { captureException: CaptureExceptionFunction },
) {
  return Result.gen(async function* () {
    const [modelURIDetails, error] = parseModelURI(modelURI).toTuple();
    if (error) {
      return Result.error(
        new TypedError.NotFound(`Invalid model URI: ${modelURI}`),
      );
    }

    const config = configs.find((p) => p.type === modelURIDetails.provider);
    if (!config) {
      return Result.error(
        new TypedError.NotFound(
          `Provider config for ${modelURIDetails.provider} not found`,
        ),
      );
    }

    const adapter = getProviderAdapter(config.type);
    const models = yield* await adapter.fetchModels(config, {
      captureException,
    });

    const model = models.find((m) => m.uri === modelURI);
    if (!model) {
      return Result.error(
        new TypedError.NotFound(`Model ${modelURI} not found`),
      );
    }

    return model;
  });
}
