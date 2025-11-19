import { type AIGatewayModel } from "../schemas/model";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";

// cspell:ignore devstral
const MODEL_TAGS: Record<string, AIGatewayModel.ModelTag[]> = {
  "claude-haiku-4.5": ["coding", "recommended", "default"], // Main default across all providers
  "claude-opus-4.1": ["coding"],
  "claude-sonnet-4": ["coding"],
  "claude-sonnet-4.5": ["coding", "recommended"],
  "devstral-medium-2507": ["coding", "recommended"],
  "gemini-2.5-flash": ["recommended"],
  "gemini-2.5-pro": ["coding", "recommended"],
  "gemini-3-pro": ["coding", "recommended"],
  "gemini-3-pro-preview": ["coding", "recommended"],
  "glm-4.5": ["coding", "recommended"],
  "glm-4.5-air": ["coding", "recommended"],
  "glm-4.6": ["coding", "recommended"],
  "gpt-5": ["coding", "recommended"],
  "gpt-5-codex": ["coding", "recommended"],
  "gpt-5-mini": ["coding", "recommended"],
  "gpt-5-nano": ["recommended"],
  "gpt-5.1": ["coding", "recommended"],
  "gpt-5.1-codex": ["coding", "recommended"],
  "gpt-5.1-codex-mini": ["coding", "recommended"],
  "gpt-5.1-codex-nano": ["recommended"],
  "grok-4": ["coding"],
  "grok-code-fast-1": ["coding", "recommended"],
  "kimi-k2": ["coding"],
  "kimi-k2-0905": ["coding", "recommended"],
  "qwen3-coder": ["coding", "recommended"],
  "qwen3-coder-plus": ["coding", "recommended"],
  "qwen3-max": ["coding"],
  "qwen-3-coder-480b": ["coding", "recommended"], // Cerebras
};

// Models that we normally wouldn't set as default, but we for the author
const DEFAULT_MODELS_BY_CONFIG_TYPE: Partial<
  Record<AIGatewayProviderConfig.Type["type"], string[]>
> = {
  cerebras: ["glm-4.6"],
  google: ["gemini-3-pro-preview", "gemini-3-pro"],
  openai: ["gpt-5.1-codex-mini"],
  "z-ai": ["glm-4.6"],
};

export function getModelTags(
  canonicalId: AIGatewayModel.CanonicalId,
  config: AIGatewayProviderConfig.Type,
): AIGatewayModel.ModelTag[] {
  const tags: AIGatewayModel.ModelTag[] = MODEL_TAGS[canonicalId] ?? [];

  // Don't recommend Codex for OpenAI-compatible because it requires the responses API
  if (config.type === "openai-compatible" && canonicalId === "gpt-5-codex") {
    return tags.filter((tag) => tag !== "recommended" && tag !== "default");
  }

  const defaultModels = DEFAULT_MODELS_BY_CONFIG_TYPE[config.type] ?? [];
  const isDefault = defaultModels.includes(canonicalId);

  if (isDefault && !tags.includes("default")) {
    return [...tags, "default"];
  }

  return [...tags];
}
