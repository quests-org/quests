import { describe, expect, it } from "vitest";

import { AIGatewayModelURI } from "./model-uri";

describe("AIGatewayModelURI.parse", () => {
  it.each([
    {
      description: "valid OpenAI model URI",
      uri: "openai/gpt-4?provider=openai&providerConfigId=openai-config-id",
      valid: true,
    },
    {
      description: "valid Anthropic model URI",
      uri: "anthropic/claude-sonnet-4.5?provider=anthropic&providerConfigId=anthropic-config-id",
      valid: true,
    },
    {
      description: "valid model URI with special characters in canonicalId",
      uri: "google/gemini-1.5-pro-002?provider=google&providerConfigId=google-config-id",
      valid: true,
    },
    {
      description: "invalid URI without query parameters",
      uri: "openai/gpt-4",
      valid: false,
    },
    {
      description: "invalid URI without author",
      uri: "gpt-4?provider=openai&providerConfigId=openai-config-id",
      valid: false,
    },
    {
      description: "invalid URI without canonicalId",
      uri: "openai/?provider=openai&providerConfigId=openai-config-id",
      valid: false,
    },
    {
      description: "invalid URI with missing provider parameter",
      uri: "openai/gpt-4?providerConfigId=openai-config-id",
      valid: false,
    },
    {
      description: "invalid URI with missing providerConfigId parameter",
      uri: "openai/gpt-4?provider=openai",
      valid: false,
    },
    {
      description: "invalid URI with invalid provider type",
      uri: "openai/gpt-4?provider=invalid-provider&providerConfigId=openai-config-id",
      valid: false,
    },
    {
      description: "empty URI",
      uri: "",
      valid: false,
    },
    {
      description: "URI with only query parameters",
      uri: "?provider=openai&providerConfigId=openai-config-id",
      valid: false,
    },
  ])("should parse: $description", ({ uri, valid }) => {
    const result = AIGatewayModelURI.parse(uri);
    expect(result.ok).toBe(valid);
  });
});
