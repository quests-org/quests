import { type AIProviderType } from "@quests/shared";

export function providerTypeToAuthor(providerType: AIProviderType) {
  switch (providerType) {
    case "anthropic": {
      return "anthropic";
    }
    case "openai": {
      return "openai";
    }
    case "openai-compatible": {
      return "openai-compatible";
    }
    case "openrouter": {
      return "openrouter";
    }
    default: {
      return providerType;
    }
  }
}
