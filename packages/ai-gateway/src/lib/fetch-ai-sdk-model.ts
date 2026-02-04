import { type LanguageModelV3 } from "@ai-sdk/provider";
import {
  type CaptureExceptionFunction,
  type WorkspaceServerURL,
} from "@quests/shared";
import { Result } from "typescript-result";

import { AIGatewayModelURI } from "../schemas/model-uri";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { aiSDKForProviderConfig } from "./ai-sdk-for-provider-config";
import { TypedError } from "./errors";
import { fetchModel } from "./fetch-model";

export const TEST_MODEL_OVERRIDE_KEY = "__testModelOverride";

export async function fetchAISDKModel({
  captureException,
  configs,
  modelURI,
  workspaceServerURL,
}: {
  captureException: CaptureExceptionFunction;
  configs: AIGatewayProviderConfig.Type[];
  modelURI: AIGatewayModelURI.Type;
  workspaceServerURL: WorkspaceServerURL;
}) {
  return Result.gen(async function* () {
    // Test override: check early to avoid fetching models over network
    const modelURIDetails = AIGatewayModelURI.parse(modelURI).getOrThrow();
    const config = configs.find(
      (c) => c.id === modelURIDetails.params.providerConfigId,
    );

    if (config) {
      const testOverride = (
        config as { [TEST_MODEL_OVERRIDE_KEY]?: LanguageModelV3 }
      )[TEST_MODEL_OVERRIDE_KEY];
      if (testOverride) {
        return testOverride;
      }
    }

    const model = yield* await fetchModel({
      captureException,
      configs,
      modelURI,
    });

    if (!config) {
      return Result.error(
        new TypedError.NotFound(`Provider ${model.params.provider} not found`),
      );
    }

    const sdk = await aiSDKForProviderConfig(config, workspaceServerURL);
    const aiSDKModel = sdk(model.providerId);
    return aiSDKModel;
  });
}
