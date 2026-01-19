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

export const errorModelNotFoundSession: SessionMessage.WithParts[] = [
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
        code: "model-not-found",
        message: "The requested model could not be found",
        name: "ModelNotFoundError",
        statusCode: 404,
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
