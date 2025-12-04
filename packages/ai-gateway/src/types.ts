import { type LanguageModelV2 } from "@ai-sdk/provider";
import { type CaptureExceptionFunction } from "@quests/shared";

import { type AIGatewayModel } from "./schemas/model";
import { type AIGatewayProviderConfig } from "./schemas/provider-config";

export interface AIGatewayEnv {
  Variables: {
    captureException: CaptureExceptionFunction;
    getAIProviderConfigs: GetProviderConfigs;
  };
}

export interface AIGatewayLanguageModel extends LanguageModelV2 {
  __aiGatewayModel: AIGatewayModel.Type;
}

export type GetProviderConfigs = () => AIGatewayProviderConfig.Type[];
