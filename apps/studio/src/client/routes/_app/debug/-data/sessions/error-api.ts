import { type SessionMessage, StoreId } from "@quests/workspace/client";

import { SessionBuilder } from "./helpers";

const builder = new SessionBuilder();
const sessionId = builder.getSessionId();

const userMessageId = StoreId.newMessageId();
const assistantMessageId = StoreId.newMessageId();

export const errorApiSession: SessionMessage.WithParts[] = [
  {
    id: userMessageId,
    metadata: {
      createdAt: builder.nextTime(),
      sessionId,
    },
    parts: [builder.textPart("Can you analyze this data?", userMessageId)],
    role: "user",
  },
  {
    id: assistantMessageId,
    metadata: {
      createdAt: builder.nextTime(),
      error: {
        kind: "api-call",
        message: "Rate limit exceeded. Please try again later.",
        name: "RateLimitError",
        statusCode: 429,
        url: "https://api.anthropic.com/v1/messages",
      },
      finishReason: "error",
      modelId: "claude-sonnet-4.5",
      providerId: "anthropic",
      sessionId,
    },
    parts: [
      builder.textPart(
        "I'll help you analyze the data. Let me start by",
        assistantMessageId,
      ),
    ],
    role: "assistant",
  },
];
