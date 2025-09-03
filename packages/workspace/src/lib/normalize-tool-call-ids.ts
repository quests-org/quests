import type { ModelMessage } from "ai";

import { isAnthropic } from "./is-anthropic";

export function normalizeToolCallIds({
  messages,
  modelId,
  providerId,
}: {
  messages: ModelMessage[];
  modelId: string;
  providerId: string;
}): ModelMessage[] {
  if (!isAnthropic({ modelId, providerId })) {
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
