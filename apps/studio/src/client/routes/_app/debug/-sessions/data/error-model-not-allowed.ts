import { StoreId } from "@quests/workspace/client";

import {
  createDefaultAIGatewayModel,
  createErrorMessage,
  registerSession,
  SessionBuilder,
} from "../helpers";

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
      parts: [builder.textPart("Can you help me with this?", userMessageId)],
      role: "user",
    },
    {
      id: assistantMessageId,
      metadata: {
        aiGatewayModel: createDefaultAIGatewayModel(),
        createdAt: builder.nextTime(),
        error: createErrorMessage({
          code: "model-not-allowed",
          message: "The requested model is not allowed for your account",
          name: "ModelNotAllowedError",
          statusCode: 403,
        }),
        finishReason: "error",
        modelId: "claude-3-5-sonnet-4.5",
        providerId: "quests",
        sessionId,
      },
      parts: [],
      role: "assistant",
    },
  ],
  name: "Error: Model Not Allowed",
});
