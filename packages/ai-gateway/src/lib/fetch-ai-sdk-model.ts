import {
  type CaptureExceptionFunction,
  type WorkspaceServerURL,
} from "@quests/shared";
import { Result } from "typescript-result";

import { getProviderAdapter } from "../adapters/all";
import { type AIGatewayModel } from "../schemas/model";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { TypedError } from "./errors";
import { fetchModelByURI } from "./fetch-model";

export async function fetchAISDKModel(
  modelURI: AIGatewayModel.URI,
  configs: AIGatewayProviderConfig.Type[],
  {
    captureException,
    workspaceServerURL,
  }: {
    captureException: CaptureExceptionFunction;
    workspaceServerURL: WorkspaceServerURL;
  },
) {
  return Result.gen(async function* () {
    const model = yield* await fetchModelByURI(modelURI, configs, {
      captureException,
    });

    const adapter = getProviderAdapter(model.params.provider);
    const config = configs.find((p) => p.type === model.params.provider);
    if (!config) {
      return Result.error(
        new TypedError.NotFound(`Provider ${model.params.provider} not found`),
      );
    }
    return adapter.aiSDKModel(model, {
      cacheIdentifier: config.cacheIdentifier,
      workspaceServerURL,
    });
  });
}
