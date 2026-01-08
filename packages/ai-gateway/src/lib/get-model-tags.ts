import { unique } from "radashi";

import { type AIGatewayModel } from "../schemas/model";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";

// cspell:ignore devstral
const MODEL_TAGS: Record<string, AIGatewayModel.ModelTag[]> = {
  "claude-sonnet-4.5": ["default"],
  "devstral-medium-2507": ["coding", "recommended"],
  "gemini-2.5-flash": ["recommended"],
  "gemini-2.5-pro": ["coding"],
  "grok-code-fast-1": ["coding", "recommended"],
  "kimi-k2": ["coding"],
  "kimi-k2-0905": ["coding", "recommended"],
  "qwen3-coder": ["coding", "recommended"],
  "qwen3-coder-plus": ["coding", "recommended"],
  "qwen3-max": ["coding"],
  "qwen-3-coder-480b": ["coding", "recommended"],
};

// Models that we normally wouldn't set as default, but we for the author
const DEFAULT_MODELS_BY_CONFIG_TYPE: Partial<
  Record<AIGatewayProviderConfig.Type["type"], string[]>
> = {
  cerebras: ["glm-4.6"],
  google: ["gemini-3-pro", "gemini-3-pro-preview"],
  openai: ["gpt-5.1-codex-mini"],
  "z-ai": ["glm-4.6"],
};

export function getModelTags(
  canonicalId: AIGatewayModel.CanonicalId,
  config: AIGatewayProviderConfig.Type,
): AIGatewayModel.ModelTag[] {
  const staticTags = MODEL_TAGS[canonicalId] ?? [];
  const dynamicTags = getDynamicTags(canonicalId);

  let tags = [...dynamicTags, ...staticTags];

  if (isSuperseded(canonicalId)) {
    tags = [...tags.filter((tag) => tag !== "recommended"), "legacy"];
  }

  if (canonicalId.startsWith("o-") && config.type === "openai") {
    tags = [...tags, "legacy"];
  }

  if (config.type === "openai-compatible" && canonicalId.endsWith("-codex")) {
    tags = tags.filter((tag) => tag !== "recommended" && tag !== "default");
  }

  const defaultModels = DEFAULT_MODELS_BY_CONFIG_TYPE[config.type] ?? [];
  if (defaultModels.includes(canonicalId)) {
    tags = [...tags, "default"];
  }

  return unique(tags);
}

function getDynamicTags(
  canonicalId: AIGatewayModel.CanonicalId,
): AIGatewayModel.ModelTag[] {
  // GPT-5+ models: all get coding + recommended, except nano variants
  if (matchesVersionFloor(canonicalId, "gpt-", 5)) {
    if (canonicalId.includes("nano")) {
      return ["coding"];
    }

    // Pro models are not recommended due to high cost
    if (canonicalId.includes("pro")) {
      return ["coding"];
    }
    return ["coding", "recommended"];
  }

  // Claude 4+ models: .5 variants get coding + recommended, others get coding only
  if (
    matchesVersionFloor(canonicalId, "claude-sonnet-", 4) ||
    matchesVersionFloor(canonicalId, "claude-haiku-", 4) ||
    matchesVersionFloor(canonicalId, "claude-opus-", 4)
  ) {
    return ["coding", "recommended"];
  }

  // Gemini 3+ models: pro variants get coding + recommended, others get recommended only
  if (matchesVersionFloor(canonicalId, "gemini-", 3)) {
    if (canonicalId.includes("-image")) {
      return [];
    }
    return ["coding", "recommended"];
  }

  // Grok 4+ models get coding + recommended
  if (
    matchesVersionFloor(canonicalId, "grok-", 4) ||
    canonicalId.startsWith("grok-code-fast-")
  ) {
    return ["coding", "recommended"];
  }

  // GLM-4+ models get coding + recommended
  if (matchesVersionFloor(canonicalId, "glm-", 4.5)) {
    return ["coding", "recommended"];
  }

  return [];
}

function isSuperseded(canonicalId: AIGatewayModel.CanonicalId): boolean {
  if (
    (canonicalId.startsWith("claude-sonnet-4") ||
      canonicalId.startsWith("claude-haiku-4") ||
      canonicalId.startsWith("claude-opus-4")) &&
    !canonicalId.endsWith(".5")
  ) {
    return true;
  }

  if (canonicalId.startsWith("claude-3")) {
    return true;
  }

  if (
    canonicalId.startsWith("gpt-5-") ||
    canonicalId === "gpt-5" ||
    canonicalId.startsWith("gpt-5.1")
  ) {
    if (canonicalId.includes("-max") || canonicalId.includes("5.1-codex")) {
      return false;
    }
    return true;
  }

  return false;
}

function matchesVersionFloor(
  modelId: string,
  prefix: string,
  floorVersion: number,
): boolean {
  if (!modelId.startsWith(prefix)) {
    return false;
  }

  const versionPart = modelId.slice(prefix.length);
  const versionMatch = /^(\d+(?:\.\d+)?)/.exec(versionPart);

  if (!versionMatch?.[1]) {
    return false;
  }

  const version = Number.parseFloat(versionMatch[1]);
  return version >= floorVersion;
}
