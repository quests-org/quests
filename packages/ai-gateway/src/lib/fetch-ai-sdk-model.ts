import {
  type CaptureExceptionFunction,
  type WorkspaceServerURL,
} from "@quests/shared";
import { Result } from "typescript-result";

import { getProviderAdapter } from "../adapters/all";
import { type AIGatewayModel } from "../schemas/model";
import { type AIGatewayProvider } from "../schemas/provider";
import { TypedError } from "./errors";
import { fetchModelByURI } from "./fetch-model";
import { fetchModelsForProvider } from "./fetch-models";
import { providerForModelURI } from "./provider-for-model-uri";

export async function fetchAISDKModel(
  modelURI: AIGatewayModel.URI,
  providers: AIGatewayProvider.Type[],
  {
    captureException,
    workspaceServerURL,
  }: {
    captureException: CaptureExceptionFunction;
    workspaceServerURL: WorkspaceServerURL;
  },
) {
  return Result.gen(async function* () {
    const model = yield* await fetchModelByURI(modelURI, providers, {
      captureException,
    });

    const adapter = getProviderAdapter(model.params.provider);
    const provider = providers.find((p) => p.type === model.params.provider);
    if (!provider) {
      return Result.error(
        new TypedError.NotFound(`Provider ${model.params.provider} not found`),
      );
    }
    return adapter.aiSDKModel(model, {
      cacheIdentifier: provider.cacheIdentifier,
      workspaceServerURL,
    });
  });
}

export async function fetchCheapAISDKModel(
  modelURI: AIGatewayModel.URI,
  providers: AIGatewayProvider.Type[],
  {
    captureException,
    workspaceServerURL,
  }: {
    captureException: CaptureExceptionFunction;
    workspaceServerURL: WorkspaceServerURL;
  },
) {
  return Result.gen(async function* () {
    const modelProvider = yield* providerForModelURI(modelURI, providers);
    const models = yield* await fetchModelsForProvider(modelProvider, {
      captureException,
    });
    const model = models.find((m) => m.tags.includes("cheap")) ?? models[0];

    if (!model) {
      return Result.error(new TypedError.NotFound("No cheap model found"));
    }
    const adapter = getProviderAdapter(model.params.provider);
    return adapter.aiSDKModel(model, {
      cacheIdentifier: modelProvider.cacheIdentifier,
      workspaceServerURL,
    });
  });
}
