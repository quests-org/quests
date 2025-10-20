import { describe, expect, it } from "vitest";

import { type AIGatewayModel } from "../client";
import { generateModelName } from "./generate-model-name";

describe("generateModelName", () => {
  it.each([
    {
      expected: "GPT 4o",
      modelId: "gpt-4o",
    },
    {
      expected: "Claude 3.5 Sonnet",
      modelId: "claude-3.5-sonnet",
    },
    {
      expected: "Llama 3.3 70B Instruct",
      modelId: "llama-3.3-70b-instruct",
    },
    {
      expected: "Gemini 2.5 Flash",
      modelId: "gemini-2.5-flash",
    },
    {
      expected: "DeepSeek V3",
      // cspell:disable-next-line
      modelId: "deepseek-v3",
    },
    {
      expected: "Qwen3 VL 8B Instruct",
      modelId: "qwen3-vl-8b-instruct",
    },
    {
      expected: "GPT OSS 120B",
      modelId: "gpt-oss-120b",
    },
    {
      expected: "GLM 4.5",
      modelId: "glm-4.5",
    },
    {
      expected: "Mistral 7B Instruct V0.3",
      modelId: "mistral-7b-instruct-v0.3",
    },
    {
      expected: "Phi 4",
      modelId: "phi-4",
    },
  ])("should convert '$modelId' to '$expected'", ({ expected, modelId }) => {
    const result = generateModelName(modelId as AIGatewayModel.CanonicalId);
    expect(result).toBe(expected);
  });
});
