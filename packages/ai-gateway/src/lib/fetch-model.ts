import { type CaptureExceptionFunction } from "@quests/shared";
import { Result } from "typescript-result";

import { getProviderAdapter } from "../adapters/all";
import { type AIGatewayModel } from "../schemas/model";
import { type AIGatewayProvider } from "../schemas/provider";
import { TypedError } from "./errors";
import { fetchModelsForProviders } from "./fetch-models";
import { findModelByString } from "./find-model-by-string";
import { parseModelURI } from "./parse-model-uri";

export async function fetchModelByString(
  {
    id,
    providers,
  }: {
    id: string;
    providers: AIGatewayProvider.Type[];
  },
  { captureException }: { captureException: CaptureExceptionFunction },
) {
  const allModels = await fetchModelsForProviders(providers, {
    captureException,
  });

  return findModelByString(id, allModels).model;
}

export async function fetchModelByURI(
  modelURI: AIGatewayModel.URI,
  providers: AIGatewayProvider.Type[],
  { captureException }: { captureException: CaptureExceptionFunction },
) {
  return Result.gen(async function* () {
    const [modelURIDetails, error] = parseModelURI(modelURI).toTuple();
    if (error) {
      return Result.error(
        new TypedError.NotFound(`Invalid model URI: ${modelURI}`),
      );
    }

    const provider = providers.find((p) => p.type === modelURIDetails.provider);
    if (!provider) {
      return Result.error(
        new TypedError.NotFound(
          `Provider ${modelURIDetails.provider} not found`,
        ),
      );
    }

    const adapter = getProviderAdapter(provider.type);
    const models = yield* await adapter.fetchModels(provider, {
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
