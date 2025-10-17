import { type CaptureExceptionFunction } from "@quests/shared";

import { type AIGatewayProviderConfig } from "./schemas/provider-config";

export interface AIGatewayEnv {
  Variables: {
    captureException: CaptureExceptionFunction;
    getAIProviderConfigs: GetProviderConfigs;
  };
}

export type GetProviderConfigs = () => AIGatewayProviderConfig.Type[];
