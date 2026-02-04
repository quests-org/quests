import { StoreId } from "@quests/workspace/client";

import { registerSession, SessionBuilder } from "../helpers";

const builder = new SessionBuilder();
const sessionId = builder.getSessionId();

const assistantMessageId = StoreId.newMessageId();

registerSession({
  messages: [
    {
      id: assistantMessageId,
      metadata: {
        createdAt: builder.nextTime(),
        finishReason: "tool-calls",
        modelId: "claude-sonnet-4.5",
        providerId: "anthropic",
        sessionId,
      },
      parts: [
        builder.toolPart(assistantMessageId, "input-streaming", {
          input: {
            explanation: "Generate a sunset image",
            filePath: "./images/sunset.png",
            prompt: "A beautiful sunset over mountains",
          },
          type: "tool-generate_image",
        }),
        builder.toolPart(assistantMessageId, "input-streaming", {
          input: {
            explanation: "Generate a forest image",
            filePath: "./images/forest.png",
            prompt: "A dense forest with tall trees",
          },
          type: "tool-generate_image",
        }),
        builder.toolPart(assistantMessageId, "input-streaming", {
          input: {
            explanation: "Generate an ocean image",
            filePath: "./images/ocean.png",
            prompt: "A calm ocean with blue waves",
          },
          type: "tool-generate_image",
        }),
      ],
      role: "assistant",
    },
  ],
  name: "Tools: Multiple Streaming",
});
