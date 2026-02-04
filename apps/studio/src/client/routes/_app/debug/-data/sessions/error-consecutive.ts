import { StoreId } from "@quests/workspace/client";

import { registerSession, SessionBuilder } from "./helpers";

const builder = new SessionBuilder();
const sessionId = builder.getSessionId();

const userMessageId = StoreId.newMessageId();
const assistantMessage1Id = StoreId.newMessageId();
const assistantMessage2Id = StoreId.newMessageId();
const assistantMessage3Id = StoreId.newMessageId();

registerSession({
  messages: [
  {
    id: userMessageId,
    metadata: {
      createdAt: builder.nextTime(),
      sessionId,
    },
    parts: [
      builder.textPart("Help me write a function to parse JSON", userMessageId),
    ],
    role: "user",
  },
  {
    id: assistantMessage1Id,
    metadata: {
      createdAt: builder.nextTime(),
      error: {
        kind: "api-call",
        message: "Connection timeout",
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
      builder.textPart("I'll help you create a JSON", assistantMessage1Id),
    ],
    role: "assistant",
  },
  {
    id: assistantMessage2Id,
    metadata: {
      createdAt: builder.nextTime(),
      error: {
        kind: "unknown",
        message: "Unexpected error during model inference",
      },
      finishReason: "error",
      modelId: "claude-sonnet-4.5",
      providerId: "anthropic",
      sessionId,
    },
    parts: [],
    role: "assistant",
  },
  {
    id: assistantMessage3Id,
    metadata: {
      createdAt: builder.nextTime(),
      error: {
        kind: "api-call",
        message: "Service overloaded. Please retry.",
        name: "ServiceError",
        statusCode: 503,
        url: "https://api.anthropic.com/v1/messages",
      },
      finishReason: "error",
      modelId: "claude-sonnet-4.5",
      providerId: "anthropic",
      sessionId,
    },
    parts: [],
    role: "assistant",
  },
  ],
  name: "Error: Consecutive Errors",
});
