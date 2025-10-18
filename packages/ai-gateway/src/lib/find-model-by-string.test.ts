import {
  type AIProviderConfigId,
  AIProviderConfigIdSchema,
} from "@quests/shared";
import { describe, expect, it } from "vitest";

import { DEFAULT_OPENAI_MODEL } from "../constants";
import { AIGatewayModel } from "../schemas/model";
import { AIGatewayModelURI } from "../schemas/model-uri";
import { findModelByString } from "./find-model-by-string";

const TEST_PROVIDER_CONFIG_ID = AIProviderConfigIdSchema.parse(
  "test-provider-config-id",
);

const createModelURI = (
  author: string,
  canonicalId: string,
  params: Omit<AIGatewayModelURI.Params, "providerConfigId"> & {
    providerConfigId?: string;
  },
): string => {
  return `${author}/${canonicalId}?${new URLSearchParams({
    ...params,
    providerConfigId:
      params.providerConfigId ?? TEST_PROVIDER_CONFIG_ID.toString(),
  }).toString()}`;
};

const createMockModel = ({
  author,
  canonicalId,
  provider,
  providerConfigId = TEST_PROVIDER_CONFIG_ID,
  providerId,
}: {
  author: string;
  canonicalId: string;
  provider: "anthropic" | "openai" | "openrouter";
  providerConfigId?: AIProviderConfigId;
  providerId: string;
}): AIGatewayModel.Type => {
  const model: Omit<AIGatewayModel.Type, "uri"> = {
    author,
    canonicalId: AIGatewayModel.CanonicalIdSchema.parse(canonicalId),
    features: ["inputText", "outputText", "tools"],
    params: {
      provider,
      providerConfigId,
    },
    providerId: AIGatewayModel.ProviderIdSchema.parse(providerId),
    providerName: "Test Provider",
    source: {
      providerType: "openai",
      value: { id: providerId },
    },
    tags: [],
  };
  return {
    ...model,
    uri: AIGatewayModelURI.fromModel(model),
  };
};

const mockModels: AIGatewayModel.Type[] = [
  createMockModel({
    author: "openai",
    canonicalId: "gpt-4",
    provider: "openai",
    providerId: "gpt-4",
  }),
  createMockModel({
    author: "openai",
    canonicalId: "gpt-3.5-turbo",
    provider: "openai",
    providerId: "gpt-3.5-turbo",
  }),
  createMockModel({
    author: "openai",
    canonicalId: "gpt-4-turbo",
    provider: "openai",
    providerId: "gpt-4-turbo",
  }),
  createMockModel({
    author: "anthropic",
    canonicalId: "claude-3-sonnet",
    provider: "anthropic",
    providerId: "claude-3-sonnet",
  }),
  createMockModel({
    author: "anthropic",
    canonicalId: "claude-3-haiku",
    provider: "anthropic",
    providerId: "claude-3-haiku",
  }),
  createMockModel({
    author: "anthropic",
    canonicalId: "claude-3-opus",
    provider: "anthropic",
    providerId: "claude-3-opus",
  }),
  createMockModel({
    author: "meta-llama",
    canonicalId: "llama-4-scout",
    provider: "openrouter",
    providerId: "meta-llama/llama-4-scout",
  }),
];

describe("findModelByString", () => {
  it.each([
    {
      description: "should find model by exact URI match",
      expectedAuthor: "openai",
      expectedCanonicalId: "gpt-4",
      input: createModelURI("openai", "gpt-4", {
        provider: "openai",
      }),
      models: mockModels,
    },
    {
      description: "should find model by exact canonicalId match",
      expectedAuthor: "openai",
      expectedCanonicalId: "gpt-4",
      input: "gpt-4",
      models: mockModels,
    },
    {
      description: "should find anthropic models by canonicalId",
      expectedAuthor: "anthropic",
      expectedCanonicalId: "claude-3-sonnet",
      input: "claude-3-sonnet",
      models: mockModels,
    },
    {
      description: "should find openrouter models by URI",
      expectedAuthor: "meta-llama",
      expectedCanonicalId: "llama-4-scout",
      input: createModelURI("meta-llama", "llama-4-scout", {
        provider: "openrouter",
      }),
      models: mockModels,
    },
    {
      description: "should find openrouter models by providerId",
      expectedAuthor: "meta-llama",
      expectedCanonicalId: "llama-4-scout",
      input: "meta-llama/llama-4-scout",
      models: mockModels,
    },
  ])(
    "$description",
    ({ expectedAuthor, expectedCanonicalId, input, models }) => {
      const result = findModelByString(input, models);
      expect(result).toBeDefined();
      expect(result.model?.canonicalId).toBe(expectedCanonicalId);
      expect(result.model?.author).toBe(expectedAuthor);
    },
  );

  it.each([
    {
      description: "should return undefined for non-existent model",
      input: "non-existent-model",
      models: mockModels,
    },
    {
      description: "should return undefined for partial matches",
      input: "gpt",
      models: mockModels,
    },
    {
      description: "should be case sensitive",
      input: "GPT-4",
      models: mockModels,
    },
    {
      description: "should handle empty models array",
      input: "gpt-4",
      models: [],
    },
    {
      description: "should handle empty search term",
      input: "",
      models: mockModels,
    },
  ])("$description", ({ input, models }) => {
    const result = findModelByString(input, models);
    expect(result.model).toBeUndefined();
  });

  it("should prioritize URI match over canonicalId match", () => {
    const modelsWithConflict = [
      createMockModel({
        author: "openai",
        canonicalId: "some-model",
        provider: "openai",
        providerId: "some-model",
      }),
      createMockModel({
        author: "anthropic",
        canonicalId: "some-model",
        provider: "anthropic",
        providerId: "some-model",
      }),
    ];

    const result = findModelByString(
      createModelURI("anthropic", "some-model", {
        provider: "anthropic",
      }),
      modelsWithConflict,
    );
    expect(result.exact).toBe(true);
    expect(result.model?.author).toBe("anthropic");
  });

  describe("model variations", () => {
    it.each([
      { expectedCanonicalId: "gpt-3.5-turbo", input: "gpt-3.5-turbo" },
      { expectedCanonicalId: "gpt-4-turbo", input: "gpt-4-turbo" },
      { expectedCanonicalId: "claude-3-haiku", input: "claude-3-haiku" },
      { expectedCanonicalId: "claude-3-opus", input: "claude-3-opus" },
    ])(
      "should find $input by canonicalId",
      ({ expectedCanonicalId, input }) => {
        const result = findModelByString(input, mockModels);
        expect(result).toBeDefined();
        expect(result.model?.canonicalId).toBe(expectedCanonicalId);
      },
    );

    it.each([
      {
        expectedAuthor: "openai",
        expectedCanonicalId: "gpt-3.5-turbo",
        input: createModelURI("openai", "gpt-3.5-turbo", {
          provider: "openai",
        }),
      },
      {
        expectedAuthor: "anthropic",
        expectedCanonicalId: "claude-3-haiku",
        input: createModelURI("anthropic", "claude-3-haiku", {
          provider: "anthropic",
        }),
      },
    ])(
      "should find $input by URI",
      ({ expectedAuthor, expectedCanonicalId, input }) => {
        const result = findModelByString(input, mockModels);
        expect(result).toBeDefined();
        expect(result.model?.canonicalId).toBe(expectedCanonicalId);
        expect(result.model?.author).toBe(expectedAuthor);
      },
    );
  });

  describe("default model", () => {
    it("should find model with default tag when searching for default model", () => {
      const result = findModelByString(DEFAULT_OPENAI_MODEL, [
        createMockModel({
          author: "openai",
          canonicalId: "not-it-1",
          provider: "openai",
          providerId: "not-it-1",
        }),
        createMockModel({
          author: "openai",
          canonicalId: "not-it-2",
          provider: "openai",
          providerId: "not-it-2",
        }),
        {
          ...createMockModel({
            author: "openai",
            canonicalId: "default-model",
            provider: "openai",
            providerId: "default-model",
          }),
          tags: ["default"],
        },
        createMockModel({
          author: "anthropic",
          canonicalId: "not-it-3",
          provider: "anthropic",
          providerId: "not-it-3",
        }),
      ]);
      expect(result).toBeDefined();
      expect(result.model?.canonicalId).toBe("default-model");
      expect(result.model?.tags).toContain("default");
    });
  });

  describe("provider config ID matching", () => {
    const alternativeConfigId = AIProviderConfigIdSchema.parse(
      "alternative-config-id",
    );
    const thirdConfigId = AIProviderConfigIdSchema.parse("third-config-id");

    it("should match model by URI with specific provider config ID", () => {
      const modelsWithDifferentConfigs = [
        createMockModel({
          author: "openai",
          canonicalId: "gpt-4",
          provider: "openai",
          providerConfigId: TEST_PROVIDER_CONFIG_ID,
          providerId: "gpt-4",
        }),
        createMockModel({
          author: "openai",
          canonicalId: "gpt-4",
          provider: "openai",
          providerConfigId: alternativeConfigId,
          providerId: "gpt-4",
        }),
      ];

      const result = findModelByString(
        createModelURI("openai", "gpt-4", {
          provider: "openai",
          providerConfigId: alternativeConfigId.toString(),
        }),
        modelsWithDifferentConfigs,
      );

      expect(result.exact).toBe(true);
      expect(result.model?.params.providerConfigId).toBe(alternativeConfigId);
    });

    it("should not match when provider config ID differs", () => {
      const modelsWithDifferentConfigs = [
        createMockModel({
          author: "openai",
          canonicalId: "gpt-4",
          provider: "openai",
          providerConfigId: TEST_PROVIDER_CONFIG_ID,
          providerId: "gpt-4",
        }),
      ];

      const result = findModelByString(
        createModelURI("openai", "gpt-4", {
          provider: "openai",
          providerConfigId: alternativeConfigId.toString(),
        }),
        modelsWithDifferentConfigs,
      );

      expect(result.model).toBeUndefined();
    });

    it("should match correct model among multiple with same canonicalId but different provider configs", () => {
      const modelsWithMultipleConfigs = [
        createMockModel({
          author: "anthropic",
          canonicalId: "claude-3-opus",
          provider: "anthropic",
          providerConfigId: TEST_PROVIDER_CONFIG_ID,
          providerId: "claude-3-opus",
        }),
        createMockModel({
          author: "anthropic",
          canonicalId: "claude-3-opus",
          provider: "anthropic",
          providerConfigId: alternativeConfigId,
          providerId: "claude-3-opus",
        }),
        createMockModel({
          author: "anthropic",
          canonicalId: "claude-3-opus",
          provider: "anthropic",
          providerConfigId: thirdConfigId,
          providerId: "claude-3-opus",
        }),
      ];

      const result = findModelByString(
        createModelURI("anthropic", "claude-3-opus", {
          provider: "anthropic",
          providerConfigId: thirdConfigId.toString(),
        }),
        modelsWithMultipleConfigs,
      );

      expect(result.exact).toBe(true);
      expect(result.model?.params.providerConfigId).toBe(thirdConfigId);
    });

    it("should fallback to canonicalId match when URI doesn't specify provider config ID", () => {
      const modelsWithDifferentConfigs = [
        createMockModel({
          author: "openai",
          canonicalId: "gpt-4",
          provider: "openai",
          providerConfigId: TEST_PROVIDER_CONFIG_ID,
          providerId: "gpt-4",
        }),
        createMockModel({
          author: "openai",
          canonicalId: "gpt-4",
          provider: "openai",
          providerConfigId: alternativeConfigId,
          providerId: "gpt-4",
        }),
      ];

      const result = findModelByString("gpt-4", modelsWithDifferentConfigs);

      expect(result.exact).toBe(false);
      expect(result.model?.canonicalId).toBe("gpt-4");
    });

    it("should distinguish between same model on different providers with different configs", () => {
      const modelsAcrossProviders = [
        createMockModel({
          author: "openai",
          canonicalId: "gpt-4",
          provider: "openai",
          providerConfigId: TEST_PROVIDER_CONFIG_ID,
          providerId: "gpt-4",
        }),
        createMockModel({
          author: "openai",
          canonicalId: "gpt-4",
          provider: "openrouter",
          providerConfigId: alternativeConfigId,
          providerId: "openai/gpt-4",
        }),
      ];

      const openrouterResult = findModelByString(
        createModelURI("openai", "gpt-4", {
          provider: "openrouter",
          providerConfigId: alternativeConfigId.toString(),
        }),
        modelsAcrossProviders,
      );

      expect(openrouterResult.exact).toBe(true);
      expect(openrouterResult.model?.params.provider).toBe("openrouter");
      expect(openrouterResult.model?.params.providerConfigId).toBe(
        alternativeConfigId,
      );

      const openaiResult = findModelByString(
        createModelURI("openai", "gpt-4", {
          provider: "openai",
          providerConfigId: TEST_PROVIDER_CONFIG_ID.toString(),
        }),
        modelsAcrossProviders,
      );

      expect(openaiResult.exact).toBe(true);
      expect(openaiResult.model?.params.provider).toBe("openai");
      expect(openaiResult.model?.params.providerConfigId).toBe(
        TEST_PROVIDER_CONFIG_ID,
      );
    });
  });
});
