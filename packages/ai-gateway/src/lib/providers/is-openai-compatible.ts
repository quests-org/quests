import { type AIProviderType } from "@quests/shared";

export function isOpenAICompatible(_providerType: AIProviderType) {
  // For now, they all are
  return true;
}
