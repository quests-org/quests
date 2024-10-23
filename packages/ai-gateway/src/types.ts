import { type CaptureExceptionFunction } from "@quests/shared";

import { type AIGatewayProvider } from "./schemas/provider";

export interface AIGatewayEnv {
  Variables: {
    captureException: CaptureExceptionFunction;
    getAIProviders: GetAIProviders;
  };
}

export type GetAIProviders = () => AIGatewayProvider.Type[];
