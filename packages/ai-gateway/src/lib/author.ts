import { type AIGatewayProvider } from "../schemas/provider";

export function providerTypeToAuthor(
  providerType: AIGatewayProvider.Type["type"],
) {
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
