import { StoreId } from "@quests/workspace/client";

import { registerSession, SessionBuilder } from "../helpers";

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
        builder.textPart(
          "Can you help me debug this complex issue?",
          userMessageId,
        ),
      ],
      role: "user",
    },
    {
      id: assistantMessageId,
      metadata: {
        createdAt: builder.nextTime(),
        error: {
          kind: "api-call",
          message: "Request timeout - the server took too long to respond",
          name: "TimeoutError",
          statusCode: 504,
          url: "https://api.anthropic.com/v1/messages",
        },
        finishReason: "error",
        modelId: "claude-sonnet-4.5",
        providerId: "anthropic",
        sessionId,
      },
      parts: [
        builder.textPart(
          "I'll help you debug this. Let me analyze the",
          assistantMessageId,
        ),
      ],
      role: "assistant",
    },
  ],
  name: "Error: Timeout",
});
