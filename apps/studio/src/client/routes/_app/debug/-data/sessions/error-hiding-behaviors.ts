import { type SessionMessage, StoreId } from "@quests/workspace/client";

import {
  createDefaultAIGatewayModel,
  createErrorMessage,
  SessionBuilder,
} from "./helpers";

const builder = new SessionBuilder();
const sessionId = builder.getSessionId();

const userMessage1Id = StoreId.newMessageId();
const assistantMessage1Id = StoreId.newMessageId();
const userMessage2Id = StoreId.newMessageId();
const assistantMessage2Id = StoreId.newMessageId();
const userMessage3Id = StoreId.newMessageId();
const assistantMessage3Id = StoreId.newMessageId();

export const errorHidingBehaviorsSession: SessionMessage.WithParts[] = [
  {
    id: userMessage1Id,
    metadata: {
      createdAt: builder.nextTime(),
      sessionId,
    },
    parts: [
      builder.textPart("Can you help me analyze this code?", userMessage1Id),
    ],
    role: "user",
  },
  {
    id: assistantMessage1Id,
    metadata: {
      aiGatewayModel: createDefaultAIGatewayModel(),
      createdAt: builder.nextTime(),
      error: createErrorMessage({
        code: "insufficient-credits",
        message:
          "Your account has insufficient credits to complete this request",
        name: "InsufficientCreditsError",
        statusCode: 402,
      }),
      finishReason: "error",
      modelId: "claude-3-5-sonnet-4.5",
      providerId: "quests",
      sessionId,
    },
    parts: [
      builder.textPart(
        "[HIDDEN] Insufficient credits error - not shown because it's not the last message",
        assistantMessage1Id,
      ),
    ],
    role: "assistant",
  },
  {
    id: userMessage2Id,
    metadata: {
      createdAt: builder.nextTime(),
      sessionId,
    },
    parts: [
      builder.textPart(
        "Let me try that request again with my updated account",
        userMessage2Id,
      ),
    ],
    role: "user",
  },
  {
    id: assistantMessage2Id,
    metadata: {
      aiGatewayModel: createDefaultAIGatewayModel(),
      createdAt: builder.nextTime(),
      error: {
        kind: "aborted",
        message: "Request was aborted by user",
      },
      finishReason: "error",
      modelId: "claude-3-5-sonnet-4.5",
      providerId: "quests",
      sessionId,
    },
    parts: [
      builder.textPart(
        "[HIDDEN] Aborted error - not shown because user stopped the agent. I can help you analyze that code. Let me start by reading the file structure...",
        assistantMessage2Id,
      ),
    ],
    role: "assistant",
  },
  {
    id: userMessage3Id,
    metadata: {
      createdAt: builder.nextTime(),
      sessionId,
    },
    parts: [
      builder.textPart("Please continue with the analysis", userMessage3Id),
    ],
    role: "user",
  },
  {
    id: assistantMessage3Id,
    metadata: {
      aiGatewayModel: createDefaultAIGatewayModel(),
      createdAt: builder.nextTime(),
      error: {
        kind: "api-call",
        message: "Connection timeout",
        name: "TimeoutError",
        statusCode: 504,
        url: "https://api.anthropic.com/v1/messages",
      },
      finishReason: "error",
      modelId: "claude-3-5-sonnet-4.5",
      providerId: "quests",
      sessionId,
    },
    parts: [
      builder.textPart(
        "[VISIBLE] Timeout error below - shown because it's the last message. Sure, I'll continue the analysis from where we left off...",
        assistantMessage3Id,
      ),
    ],
    role: "assistant",
  },
];
