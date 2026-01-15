import { AIProviderConfigIdSchema } from "@quests/shared";
import { describe, expect, it } from "vitest";

import { AIGatewayModel } from "../schemas/model";
import { AIGatewayModelURI } from "../schemas/model-uri";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { addHeuristicTags } from "./add-heuristic-tags";

const mockConfig: AIGatewayProviderConfig.Type = {
  apiKey: "NOT_NEEDED",
  cacheIdentifier: "quests",
  id: AIProviderConfigIdSchema.parse("test"),
  type: "openrouter",
};

function createMockModel(
  providerId: string,
  existingTags: AIGatewayModel.ModelTag[] = [],
): AIGatewayModel.Type {
  const [author = "test-author", rawCanonicalId = providerId] =
    providerId.split("/");
  const canonicalId = AIGatewayModel.CanonicalIdSchema.parse(rawCanonicalId);
  const params = {
    provider: "openrouter" as const,
    providerConfigId: mockConfig.id,
  };
  return {
    author,
    canonicalId,
    features: [],
    name: canonicalId,
    params,
    providerId: AIGatewayModel.ProviderIdSchema.parse(providerId),
    providerName: "Test Provider",
    tags: existingTags,
    uri: AIGatewayModelURI.fromModel({ author, canonicalId, params }),
  };
}

describe("addHeuristicTags", () => {
  const testCases: {
    expected: AIGatewayModel.ModelTag[];
    modelId: string;
  }[] = [
    { expected: [], modelId: "gpt-4.1" },
    { expected: [], modelId: "gpt-4-turbo" },
    { expected: ["coding", "legacy"], modelId: "gpt-5" },
    { expected: ["coding", "legacy"], modelId: "gpt-5.1" },
    { expected: ["coding", "recommended"], modelId: "gpt-5.1-codex" },
    { expected: ["coding", "recommended"], modelId: "gpt-5.1-codex-mini" },
    { expected: ["coding", "legacy"], modelId: "gpt-5.1-mini" },
    { expected: ["coding", "recommended"], modelId: "gpt-5.2" },
    { expected: ["coding"], modelId: "gpt-5.2-pro" },
    { expected: ["coding"], modelId: "gpt-5.2-pro-2025-12-11" },
    { expected: ["coding", "recommended"], modelId: "gpt-5.3" },
    { expected: ["coding", "legacy"], modelId: "gpt-5-nano" },
    { expected: ["coding", "legacy"], modelId: "gpt-5-mini" },
    { expected: ["coding", "recommended"], modelId: "gpt-6" },
    { expected: ["coding", "recommended"], modelId: "gpt-10" },
    { expected: ["legacy"], modelId: "claude-3-opus" },
    { expected: ["legacy"], modelId: "claude-3-sonnet" },
    { expected: ["legacy"], modelId: "claude-3.5-haiku" },
    { expected: ["coding", "legacy"], modelId: "claude-sonnet-4" },
    { expected: ["coding", "legacy"], modelId: "claude-sonnet-4.1" },
    { expected: ["coding", "recommended"], modelId: "claude-sonnet-5" },
    { expected: ["coding", "recommended"], modelId: "claude-sonnet-6" },
    {
      expected: ["coding", "recommended", "default"],
      modelId: "claude-sonnet-4.5",
    },
    { expected: ["coding", "legacy"], modelId: "claude-haiku-4" },
    { expected: ["coding", "legacy"], modelId: "claude-haiku-4.2" },
    { expected: ["coding", "recommended"], modelId: "claude-haiku-4.5" },
    { expected: ["coding", "recommended"], modelId: "claude-haiku-5" },
    { expected: ["coding", "recommended"], modelId: "claude-haiku-5.5" },
    { expected: ["coding", "legacy"], modelId: "claude-opus-4" },
    { expected: ["coding", "legacy"], modelId: "claude-opus-4.3" },
    { expected: ["coding", "recommended"], modelId: "claude-opus-4.5" },
    { expected: ["coding", "recommended"], modelId: "claude-opus-5" },
    { expected: ["coding", "recommended"], modelId: "claude-opus-5.5" },
    { expected: [], modelId: "gemini-2-pro" },
    { expected: [], modelId: "gemini-2-flash" },
    { expected: ["coding"], modelId: "gemini-2.5-pro" },
    { expected: ["recommended"], modelId: "gemini-2.5-flash" },
    { expected: ["coding", "recommended"], modelId: "gemini-3" },
    { expected: ["coding", "recommended"], modelId: "gemini-3-pro" },
    { expected: ["coding", "recommended"], modelId: "gemini-3-pro-preview" },
    { expected: [], modelId: "gemini-3-pro-image-preview" },
    { expected: ["coding", "recommended"], modelId: "gemini-3-flash" },
    { expected: ["coding", "recommended"], modelId: "gemini-3-flash-preview" },
    { expected: ["coding", "recommended"], modelId: "gemini-3-nano" },
    { expected: ["coding", "recommended"], modelId: "gemini-4" },
    { expected: [], modelId: "grok-3" },
    { expected: [], modelId: "grok-3.5" },
    { expected: ["coding", "recommended"], modelId: "grok-4" },
    { expected: ["coding", "recommended"], modelId: "grok-4.1" },
    { expected: ["coding", "recommended"], modelId: "grok-4.1-fast" },
    { expected: ["coding", "recommended"], modelId: "grok-4.2" },
    { expected: ["coding", "recommended"], modelId: "grok-5" },
    { expected: [], modelId: "glm-3.5" },
    { expected: [], modelId: "glm-4" },
    { expected: ["coding", "recommended"], modelId: "glm-4.5" },
    { expected: ["coding", "recommended"], modelId: "glm-4.5-air" },
    { expected: ["coding", "recommended"], modelId: "glm-4.6" },
    { expected: ["coding", "recommended"], modelId: "glm-4.7" },
    { expected: [], modelId: "glm-4.1v-9b-thinking" },
    { expected: ["coding", "recommended"], modelId: "glm-5" },
    { expected: ["coding", "recommended"], modelId: "claude-sonnet-5.5" },
  ].map(({ expected, modelId }) => ({
    expected: expected.map((tag) => AIGatewayModel.ModelTagSchema.parse(tag)),
    modelId,
  }));

  it.each(testCases)(
    "should return $expected for $modelId",
    ({ expected, modelId }) => {
      const model = createMockModel(modelId);
      const result = addHeuristicTags(model, mockConfig);
      expect(result.tags).toEqual(expected);
    },
  );

  it("should add default tag for provider-specific defaults", () => {
    const openaiConfig: AIGatewayProviderConfig.Type = {
      apiKey: "NOT_NEEDED",
      cacheIdentifier: "openai",
      id: AIProviderConfigIdSchema.parse("openai"),
      type: "openai",
    };
    const model = createMockModel("openai/gpt-5.1-codex-mini");
    const result = addHeuristicTags(model, openaiConfig);
    expect(result.tags).toContain("default");
  });

  it("should not recommend gpt-5-codex for openai-compatible", () => {
    const compatConfig: AIGatewayProviderConfig.Type = {
      apiKey: "NOT_NEEDED",
      cacheIdentifier: "openai-compatible",
      id: AIProviderConfigIdSchema.parse("openai-compatible"),
      type: "openai-compatible",
    };
    const model = createMockModel("openai-compatible/gpt-5-codex");
    const result = addHeuristicTags(model, compatConfig);
    expect(result.tags).not.toContain("recommended");
    expect(result.tags).not.toContain("default");
  });

  it("should mark o- models as legacy for OpenAI provider", () => {
    const openaiConfig: AIGatewayProviderConfig.Type = {
      apiKey: "NOT_NEEDED",
      cacheIdentifier: "openai",
      id: AIProviderConfigIdSchema.parse("openai"),
      type: "openai",
    };
    const model = createMockModel("openai/o-1");
    const result = addHeuristicTags(model, openaiConfig);
    expect(result.tags).toContain("legacy");
  });

  it("should not mark o- models as legacy for non-OpenAI providers", () => {
    const model = createMockModel("openai/o-1");
    const result = addHeuristicTags(model, mockConfig);
    expect(result.tags).not.toContain("legacy");
  });

  it("should return default, recommended, and coding tags for quests author", () => {
    const model = createMockModel("quests/auto");
    const result = addHeuristicTags(model, mockConfig);
    expect(result.tags).toEqual(["recommended", "coding", "default"]);
  });

  it("should preserve existing tags and add heuristic tags", () => {
    const model = createMockModel("test-author/gpt-5.2", ["new"]);
    const result = addHeuristicTags(model, mockConfig);
    expect(result.tags).toEqual(["new", "coding", "recommended"]);
  });
});
