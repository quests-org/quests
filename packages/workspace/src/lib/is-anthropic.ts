import type { AIGatewayModel } from "@quests/ai-gateway";

export function isAnthropic(model: AIGatewayModel.Type): boolean {
  return (
    model.author === "anthropic" ||
    model.params.provider === "anthropic" ||
    model.canonicalId.includes("anthropic") ||
    model.canonicalId.includes("claude")
  );
}
