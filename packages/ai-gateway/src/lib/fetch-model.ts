import { type CaptureExceptionFunction } from "@quests/shared";
import { Result } from "typescript-result";

import { AIGatewayModelURI } from "../schemas/model-uri";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { TypedError } from "./errors";
import { fetchModelsForProviders } from "./fetch-models";
import { findModelByString } from "./find-model-by-string";
import { fetchModels } from "./models";

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
  modelURI: AIGatewayModelURI.Type,
  configs: AIGatewayProviderConfig.Type[],
  { captureException }: { captureException: CaptureExceptionFunction },
) {
  return Result.gen(async function* () {
    const [modelURIDetails, error] =
      AIGatewayModelURI.parse(modelURI).toTuple();
    if (error) {
      return Result.error(
        new TypedError.NotFound(`Invalid model URI: ${modelURI}`),
      );
    }

    const config = configs.find(
      (c) => c.id === modelURIDetails.params.providerConfigId,
    );
    if (!config) {
      return Result.error(
        new TypedError.NotFound(
          `Provider config for ${modelURIDetails.params.providerConfigId} not found`,
        ),
      );
    }

    const models = yield* await fetchModels(config, {
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
