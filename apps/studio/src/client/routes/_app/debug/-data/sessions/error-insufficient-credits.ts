import { type SessionMessage, StoreId } from "@quests/workspace/client";

import {
  createDefaultAIGatewayModel,
  createErrorMessage,
  SessionBuilder,
} from "./helpers";

const builder = new SessionBuilder();
const sessionId = builder.getSessionId();

const userMessageId = StoreId.newMessageId();
const assistantMessageId = StoreId.newMessageId();

export const errorInsufficientCreditsSession: SessionMessage.WithParts[] = [
  {
    id: userMessageId,
    metadata: {
      createdAt: builder.nextTime(),
      sessionId,
    },
    parts: [builder.textPart("Can you help me with this?", userMessageId)],
    role: "user",
  },
  {
    id: assistantMessageId,
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
    parts: [],
    role: "assistant",
  },
];
