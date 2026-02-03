import { type SessionMessage, StoreId } from "@quests/workspace/client";

import { createDefaultAIGatewayModel, SessionBuilder } from "./helpers";

const builder = new SessionBuilder();
const sessionId = builder.getSessionId();

const userMessageId = StoreId.newMessageId();
const assistantMessageId = StoreId.newMessageId();

export const errorNoImageModelSession: SessionMessage.WithParts[] = [
  {
    id: userMessageId,
    metadata: {
      createdAt: builder.nextTime(),
      sessionId,
    },
    parts: [
      builder.textPart(
        "Generate an image of a sunset over mountains",
        userMessageId,
      ),
    ],
    role: "user",
  },
  {
    id: assistantMessageId,
    metadata: {
      aiGatewayModel: createDefaultAIGatewayModel(),
      createdAt: builder.nextTime(),
      finishReason: "stop",
      modelId: "claude-3-5-sonnet-4.5",
      providerId: "quests",
      sessionId,
    },
    parts: [
      builder.toolPart(assistantMessageId, "output-available", {
        input: {
          explanation:
            "User requested an AI-generated image of a sunset over mountains",
          filePath: "./images/sunset-mountains",
          prompt: "A beautiful sunset over mountains with vibrant colors",
        },
        output: {
          errorMessage:
            "No AI provider with image generation capability is available.",
          errorType: "no-image-model",
          state: "failure",
        },
        type: "tool-generate_image",
      }),
    ],
    role: "assistant",
  },
];
