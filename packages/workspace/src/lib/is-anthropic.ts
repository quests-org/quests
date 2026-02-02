import type { AIGatewayModel } from "@quests/ai-gateway";

import { QUESTS_AUTO_MODEL_PROVIDER_ID } from "@quests/shared";

export function isAnthropic(model: AIGatewayModel.Type): boolean {
  return (
    model.author === "anthropic" ||
    model.params.provider === "anthropic" ||
    model.canonicalId.includes("anthropic") ||
    model.canonicalId.includes("claude") ||
    (model.params.provider === "quests" &&
      model.providerId === QUESTS_AUTO_MODEL_PROVIDER_ID)
  );
}
