import type { LanguageModelV2 } from "@ai-sdk/provider";

import {
  type AIGatewayLanguageModel,
  AIGatewayModel,
} from "@quests/ai-gateway";
import { AIProviderConfigIdSchema, type AIProviderType } from "@quests/shared";

export function createMockAIGatewayModel(
  baseModel: LanguageModelV2,
  options: {
    features?: AIGatewayModel.ModelFeatures[];
    provider?: AIProviderType;
  } = {},
): AIGatewayLanguageModel {
  const mockAIGatewayModel = createMockAIGatewayModelType(options);

  return Object.assign(baseModel, {
    __aiGatewayModel: mockAIGatewayModel,
  }) satisfies AIGatewayLanguageModel;
}

export function createMockAIGatewayModelType(
  options: {
    features?: AIGatewayModel.ModelFeatures[];
    provider?: AIProviderType;
  } = {},
): AIGatewayModel.Type {
  const {
    features = ["inputText", "outputText", "tools"],
    provider = "openai",
  } = options;

  return AIGatewayModel.Schema.parse({
    author: "test",
    canonicalId: AIGatewayModel.CanonicalIdSchema.parse("test-model"),
    features,
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
}
