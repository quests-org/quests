import type { LanguageModelV2 } from "@ai-sdk/provider";

import {
  type AIGatewayLanguageModel,
  AIGatewayModel,
} from "@quests/ai-gateway";
import { AIProviderConfigIdSchema, type AIProviderType } from "@quests/shared";

export function createMockAIGatewayModel(
  baseModel: LanguageModelV2,
  options: {
    provider?: AIProviderType;
  } = {},
): AIGatewayLanguageModel {
  const { provider = "openai" } = options;

  const mockAIGatewayModel = AIGatewayModel.Schema.parse({
    author: "test",
    canonicalId: AIGatewayModel.CanonicalIdSchema.parse("test-model"),
    features: ["inputText", "outputText", "tools"],
    name: "Test Model",
    params: {
      provider,
      providerConfigId: AIProviderConfigIdSchema.parse("test-config"),
    },
    providerId: AIGatewayModel.ProviderIdSchema.parse("test-provider"),
    providerName: "Test Provider",
    tags: ["default"],
    uri: `test/test-model?provider=${provider}&providerConfigId=test-config`,
  });

  return Object.assign(baseModel, {
    __aiGatewayModel: mockAIGatewayModel,
  }) satisfies AIGatewayLanguageModel;
}
