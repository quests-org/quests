import {
  AI_GATEWAY_API_KEY_NOT_NEEDED,
  AIProviderConfigIdSchema,
} from "@quests/shared";
import { describe, expect, it } from "vitest";

import { AIGatewayModelURI } from "../schemas/model-uri";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { migrateModelURI } from "./migrate-model-uri";

const mockConfigs: AIGatewayProviderConfig.Type[] = [
  {
    apiKey: AI_GATEWAY_API_KEY_NOT_NEEDED,
    cacheIdentifier: "openai-cache",
    displayName: "OpenAI",
    id: AIProviderConfigIdSchema.parse("openai-config-id"),
    type: "openai",
  },
  {
    apiKey: "test-api-key",
    cacheIdentifier: "anthropic-cache",
    displayName: "Anthropic",
    id: AIProviderConfigIdSchema.parse("anthropic-config-id"),
    type: "anthropic",
  },
];

describe("migrateModelURI", () => {
  it("should migrate old URI format with provider parameter to new format with provider and providerConfigId", () => {
    const oldURI = "openai/gpt-4?provider=openai";

    const result = migrateModelURI({
      configs: mockConfigs,
      modelURI: oldURI,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const newURI = result.value;
    const parseResult = AIGatewayModelURI.parse(newURI);

    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) {
      return;
    }

    expect(parseResult.value.author).toBe("openai");
    expect(parseResult.value.canonicalId).toBe("gpt-4");
    expect(parseResult.value.params.provider).toBe("openai");
    expect(parseResult.value.params.providerConfigId).toBe("openai-config-id");
  });

  it.each([
    {
      description: "invalid URI format",
      uri: "not-a-valid-uri",
    },
    {
      description: "URI with missing provider config",
      uri: "openai/gpt-4?provider=non-existent-config",
    },
    {
      description: "URI with malformed query parameters",
      uri: "openai/gpt-4?provider=",
    },
    {
      description: "empty URI",
      uri: "",
    },
    {
      description: "URI with multiple provider parameters",
      uri: "openai/gpt-4?provider=openai-config-id&provider=another-config",
    },
    {
      description: "URI without author",
      uri: "gpt-4?provider=openai-config-id",
    },
  ])("should fail to migrate: $description", ({ uri }) => {
    const result = migrateModelURI({
      configs: mockConfigs,
      modelURI: uri,
    });

    expect(result.ok).toBe(false);
  });
});
