import { AIGatewayModel, AIGatewayModelURI } from "@quests/ai-gateway";
import { AIProviderConfigIdSchema, type AIProviderType } from "@quests/shared";

export function createMockAIGatewayModel(
  options: {
    author?: string;
    features?: AIGatewayModel.ModelFeatures[];
    provider?: AIProviderType;
  } = {},
): AIGatewayModel.Type {
  const {
    author = "test",
    features = ["inputText", "outputText", "tools"],
    provider = "quests",
  } = options;
  const canonicalId = AIGatewayModel.CanonicalIdSchema.parse("mock-model-id");
  const providerConfigId = AIProviderConfigIdSchema.parse(
    "mock-provider-config-id",
  );
  const providerId = AIGatewayModel.ProviderIdSchema.parse("mock-provider-id");

  return AIGatewayModel.Schema.parse({
    author,
    canonicalId,
    features,
    name: "Mock Model",
    params: {
      provider,
      providerConfigId,
    },
    providerId,
    providerName: "Test Provider",
    tags: ["default"],
    uri: AIGatewayModelURI.fromModel({
      author,
      canonicalId,
      params: {
        provider,
        providerConfigId,
      },
    }),
  });
}
