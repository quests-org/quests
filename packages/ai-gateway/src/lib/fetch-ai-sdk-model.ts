import {
  type CaptureExceptionFunction,
  type WorkspaceServerURL,
} from "@quests/shared";
import { Result } from "typescript-result";

import { type AIGatewayModelURI } from "../schemas/model-uri";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { type AIGatewayLanguageModel } from "../types";
import { aiSDKForProviderConfig } from "./ai-sdk-for-provider-config";
import { TypedError } from "./errors";
import { fetchModelByURI } from "./fetch-model";

export async function fetchAISDKModel(
  modelURI: AIGatewayModelURI.Type,
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

    const config = configs.find((c) => c.id === model.params.providerConfigId);
    if (!config) {
      return Result.error(
        new TypedError.NotFound(`Provider ${model.params.provider} not found`),
      );
    }
    const sdk = await aiSDKForProviderConfig(config, workspaceServerURL);
    const aiSDKModel = sdk(model.providerId);
    const aiGatewayModel: AIGatewayLanguageModel = Object.assign(aiSDKModel, {
      __aiGatewayModel: model,
    });
    return aiGatewayModel;
  });
}
