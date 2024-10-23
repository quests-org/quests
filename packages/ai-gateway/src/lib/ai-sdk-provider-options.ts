import { type SharedV2ProviderOptions } from "@ai-sdk/provider";
import { type LanguageModel } from "ai";

import { ALL_PROVIDER_ADAPTERS } from "../adapters/all";

export function providerOptionsForModel(
  model: LanguageModel,
): SharedV2ProviderOptions {
  const result: SharedV2ProviderOptions = {};

  for (const adapter of ALL_PROVIDER_ADAPTERS) {
    const options = adapter.aiSDKProviderOptions?.(model);
    if (!options) {
      continue;
    }

    for (const [key, value] of Object.entries(options)) {
      if (key in result) {
        throw new Error(`Duplicate provider option key: ${key}`);
      }
      result[key] = value;
    }
  }

  return result;
}
