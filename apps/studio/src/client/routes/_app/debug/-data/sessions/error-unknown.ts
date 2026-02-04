import { StoreId } from "@quests/workspace/client";

import { registerSession, SessionBuilder } from "./helpers";

const builder = new SessionBuilder();
const sessionId = builder.getSessionId();

const userMessageId = StoreId.newMessageId();
const assistantMessageId = StoreId.newMessageId();

registerSession({
  messages: [
    {
      id: userMessageId,
      metadata: {
        createdAt: builder.nextTime(),
        sessionId,
      },
      parts: [
        builder.textPart("What's the weather like today?", userMessageId),
      ],
      role: "user",
    },
    {
      id: assistantMessageId,
      metadata: {
        createdAt: builder.nextTime(),
        error: {
          kind: "unknown",
          message:
            "An unexpected error occurred while processing your request. This might be a temporary issue.",
        },
        finishReason: "error",
        modelId: "claude-sonnet-4.5",
        providerId: "anthropic",
        sessionId,
      },
      parts: [
        builder.textPart("Let me check the weather for", assistantMessageId),
      ],
      role: "assistant",
    },
  ],
  name: "Error: Unknown",
});
