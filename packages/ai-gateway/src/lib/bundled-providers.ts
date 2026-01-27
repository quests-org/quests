import { type AIGatewayProviderConfig } from "../schemas/provider-config";

type BundledProviderPackage =
  | "@ai-sdk/anthropic"
  | "@ai-sdk/cerebras"
  | "@ai-sdk/deepinfra"
  | "@ai-sdk/deepseek"
  | "@ai-sdk/fireworks"
  | "@ai-sdk/gateway"
  | "@ai-sdk/google"
  | "@ai-sdk/groq"
  | "@ai-sdk/mistral"
  | "@ai-sdk/openai"
  | "@ai-sdk/openai-compatible"
  | "@ai-sdk/perplexity"
  | "@ai-sdk/togetherai"
  | "@ai-sdk/xai"
  | "@openrouter/ai-sdk-provider"
  | "ollama-ai-provider-v2";

const PROVIDER_TYPE_TO_PACKAGE: Partial<
  Record<AIGatewayProviderConfig.Type["type"], BundledProviderPackage>
> = {
  anthropic: "@ai-sdk/anthropic",
  cerebras: "@ai-sdk/cerebras",
  deepinfra: "@ai-sdk/deepinfra",
  deepseek: "@ai-sdk/deepseek",
  fireworks: "@ai-sdk/fireworks",
  google: "@ai-sdk/google",
  groq: "@ai-sdk/groq",
  mistral: "@ai-sdk/mistral",
  ollama: "ollama-ai-provider-v2",
  openai: "@ai-sdk/openai",
  openrouter: "@openrouter/ai-sdk-provider",
  perplexity: "@ai-sdk/perplexity",
  quests: "@openrouter/ai-sdk-provider",
  together: "@ai-sdk/togetherai",
  vercel: "@ai-sdk/gateway",
  "x-ai": "@ai-sdk/xai",
};

export function getPackageForProviderType(
  providerType: AIGatewayProviderConfig.Type["type"],
): BundledProviderPackage {
  return PROVIDER_TYPE_TO_PACKAGE[providerType] || "@ai-sdk/openai-compatible";
}
