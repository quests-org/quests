import type { AIGatewayModel } from "@quests/ai-gateway";
import type { ModelMessage } from "ai";

import { isAnthropic } from "./is-anthropic";

export function normalizeToolCallIds({
  messages,
  model,
}: {
  messages: ModelMessage[];
  model: AIGatewayModel.Type;
}): ModelMessage[] {
  if (!isAnthropic(model)) {
    return messages;
  }

  return messages.map((message) => {
    if (
      (message.role === "assistant" || message.role === "tool") &&
      Array.isArray(message.content)
    ) {
      message.content = message.content.map((part) => {
        if (
          (part.type === "tool-call" || part.type === "tool-result") &&
          "toolCallId" in part
        ) {
          return {
            ...part,
            // Anthropic doesn't support tool call IDs with special characters
            // and will error "String should match pattern '^[a-zA-Z0-9_-]+$'"
            toolCallId: part.toolCallId.replaceAll(/[^\w-]/g, "_"),
          };
        }
        return part;
      });
    }
    return message;
  });
}
