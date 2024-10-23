import type { ModelMessage } from "ai";

export function normalizeToolCallIds(msgs: ModelMessage[]): ModelMessage[] {
  return msgs.map((msg) => {
    if (
      (msg.role === "assistant" || msg.role === "tool") &&
      Array.isArray(msg.content)
    ) {
      msg.content = msg.content.map((part) => {
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
    return msg;
  });
}
