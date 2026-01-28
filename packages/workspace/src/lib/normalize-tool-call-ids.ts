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
    if (message.role === "assistant" && Array.isArray(message.content)) {
      return {
        ...message,
        content: message.content.map((part) => {
          if (part.type === "tool-call") {
            return {
              ...part,
              toolCallId: normalizeToolCallId(part.toolCallId),
            };
          }
          return part;
        }),
      };
    }
    if (message.role === "tool" && Array.isArray(message.content)) {
      return {
        ...message,
        content: message.content.map((part) => {
          if (part.type === "tool-result") {
            return {
              ...part,
              toolCallId: normalizeToolCallId(part.toolCallId),
            };
          }
          return part;
        }),
      };
    }
    return message;
  });
}

function normalizeToolCallId(toolCallId: string) {
  // Anthropic doesn't support tool call IDs with special characters
  // and will error "String should match pattern '^[a-zA-Z0-9_-]+$'"
  return toolCallId.replaceAll(/[^\w-]/g, "_");
}
