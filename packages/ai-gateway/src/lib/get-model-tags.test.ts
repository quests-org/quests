import { AIProviderConfigIdSchema } from "@quests/shared";
import { describe, expect, it } from "vitest";

import { AIGatewayModel } from "../schemas/model";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { getModelTags } from "./get-model-tags";

const mockConfig: AIGatewayProviderConfig.Type = {
  apiKey: "NOT_NEEDED",
  cacheIdentifier: "quests",
  id: AIProviderConfigIdSchema.parse("quests"),
  type: "quests",
};

describe("getModelTags", () => {
  const testCases: {
    expected: AIGatewayModel.ModelTag[];
    modelId: AIGatewayModel.CanonicalId;
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
    modelId: AIGatewayModel.CanonicalIdSchema.parse(modelId),
  }));

  it.each(testCases)(
    "should return $expected for $modelId",
    ({ expected, modelId }) => {
      const tags = getModelTags(modelId, mockConfig);
      expect(tags).toEqual(expected);
    },
  );

  it("should add default tag for provider-specific defaults", () => {
    const openaiConfig: AIGatewayProviderConfig.Type = {
      apiKey: "NOT_NEEDED",
      cacheIdentifier: "quests",
      id: AIProviderConfigIdSchema.parse("quests"),
      type: "openai",
    };
    const tags = getModelTags(
      AIGatewayModel.CanonicalIdSchema.parse("gpt-5.1-codex-mini"),
      openaiConfig,
    );
    expect(tags).toContain("default");
  });

  it("should not recommend gpt-5-codex for openai-compatible", () => {
    const compatConfig: AIGatewayProviderConfig.Type = {
      apiKey: "NOT_NEEDED",
      cacheIdentifier: "quests",
      id: AIProviderConfigIdSchema.parse("quests"),
      type: "openai-compatible",
    };
    const tags = getModelTags(
      AIGatewayModel.CanonicalIdSchema.parse("gpt-5-codex"),
      compatConfig,
    );
    expect(tags).not.toContain("recommended");
    expect(tags).not.toContain("default");
  });

  it("should mark o- models as legacy for OpenAI provider", () => {
    const openaiConfig: AIGatewayProviderConfig.Type = {
      apiKey: "NOT_NEEDED",
      cacheIdentifier: "quests",
      id: AIProviderConfigIdSchema.parse("quests"),
      type: "openai",
    };
    const tags = getModelTags(
      AIGatewayModel.CanonicalIdSchema.parse("o-1"),
      openaiConfig,
    );
    expect(tags).toContain("legacy");
  });

  it("should not mark o- models as legacy for non-OpenAI providers", () => {
    const tags = getModelTags(
      AIGatewayModel.CanonicalIdSchema.parse("o-1"),
      mockConfig,
    );
    expect(tags).not.toContain("legacy");
  });
});
