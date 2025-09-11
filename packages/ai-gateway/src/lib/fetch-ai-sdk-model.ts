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
