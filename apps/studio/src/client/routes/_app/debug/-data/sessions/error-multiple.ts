import { StoreId } from "@quests/workspace/client";

import { registerSession, SessionBuilder } from "./helpers";

const builder = new SessionBuilder();
const sessionId = builder.getSessionId();

const userMessage1Id = StoreId.newMessageId();
const assistantMessage1Id = StoreId.newMessageId();
const userMessage2Id = StoreId.newMessageId();
const assistantMessage2Id = StoreId.newMessageId();
const userMessage3Id = StoreId.newMessageId();
const assistantMessage3Id = StoreId.newMessageId();

registerSession({
  messages: [
  {
    id: userMessage1Id,
    metadata: {
      createdAt: builder.nextTime(),
      sessionId,
    },
    parts: [builder.textPart("What's 2 + 2?", userMessage1Id)],
    role: "user",
  },
  {
    id: assistantMessage1Id,
    metadata: {
      createdAt: builder.nextTime(),
      error: {
        kind: "api-call",
        message: "Service temporarily unavailable",
        name: "ServiceUnavailable",
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
  {
    id: userMessage2Id,
    metadata: {
      createdAt: builder.nextTime(),
      sessionId,
    },
    parts: [builder.textPart("Try again please", userMessage2Id)],
    role: "user",
  },
  {
    id: assistantMessage2Id,
    metadata: {
      createdAt: builder.nextTime(),
      error: {
        kind: "unknown",
        message: "Connection lost to the model provider",
      },
      finishReason: "error",
      modelId: "claude-sonnet-4.5",
      providerId: "anthropic",
      sessionId,
    },
    parts: [builder.textPart("Let me calculate that for", assistantMessage2Id)],
    role: "assistant",
  },
  {
    id: userMessage3Id,
    metadata: {
      createdAt: builder.nextTime(),
      sessionId,
    },
    parts: [builder.textPart("One more time", userMessage3Id)],
    role: "user",
  },
  {
    id: assistantMessage3Id,
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
    parts: [builder.textPart("Sure! 2 + 2 equals", assistantMessage3Id)],
    role: "assistant",
  },
  ],
  name: "Error: Multiple Errors",
});
