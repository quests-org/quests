import { type AIGatewayModel } from "../schemas/model";

const MODEL_TAGS: Record<string, AIGatewayModel.ModelTag[]> = {
  "claude-3.7-sonnet": ["coding"],
  "claude-haiku-4.5": ["coding", "recommended", "default"],
  "claude-opus-4": ["coding"],
  "claude-opus-4.1": ["coding"],
  "claude-sonnet-4": ["coding"],
  "claude-sonnet-4.5": ["coding", "recommended"],
  "gemini-2.5-flash": ["recommended"],
  "gemini-2.5-pro": ["coding", "recommended", "default"],
  "glm-4.5": ["coding", "recommended"],
  "glm-4.5-air": ["coding", "recommended"],
  "glm-4.6": ["coding", "recommended"],
  "gpt-5": ["coding", "recommended"],
  "gpt-5-codex": ["coding", "recommended", "default"],
  "gpt-5-mini": ["coding", "recommended"],
  "gpt-5-nano": ["recommended"],
  "grok-4": ["coding"],
  "grok-code-fast-1": ["coding", "recommended"],
  "kimi-k2": ["coding"],
  "kimi-k2-0905": ["coding", "recommended"],
  "qwen3-coder": ["coding", "recommended"],
  "qwen3-coder-plus": ["coding", "recommended"],
  "qwen3-max": ["coding"],
};

export function getModelTags(
  canonicalId: AIGatewayModel.CanonicalId,
): AIGatewayModel.ModelTag[] {
  const tags: AIGatewayModel.ModelTag[] = MODEL_TAGS[canonicalId] ?? [];
  return [...tags];
}
