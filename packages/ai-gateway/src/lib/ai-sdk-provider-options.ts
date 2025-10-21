import { type OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { type SharedV2ProviderOptions } from "@ai-sdk/provider";
import { type LanguageModel } from "ai";

export function providerOptionsForModel(
  model: LanguageModel,
): SharedV2ProviderOptions {
  const result: SharedV2ProviderOptions = {};

  if (
    typeof model !== "string" &&
    model.provider === "openai.responses" &&
    // Only gpt-5 and o-series models support reasoning.encrypted_content
    (model.modelId.startsWith("gpt-5") || model.modelId.startsWith("o-"))
  ) {
    result.openai = {
      include: ["reasoning.encrypted_content"],
      store: false,
    } satisfies OpenAIResponsesProviderOptions;
  }

  return result;
}
