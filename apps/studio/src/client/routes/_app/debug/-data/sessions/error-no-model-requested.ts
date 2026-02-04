import { StoreId } from "@quests/workspace/client";

import {
  createDefaultAIGatewayModel,
  createErrorMessage,
  registerSession,
  SessionBuilder,
} from "./helpers";

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
          code: "no-model-requested",
          message: "No model was specified in the request",
          name: "NoModelRequestedError",
          statusCode: 400,
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
  name: "Error: No Model Requested",
});
