import { type SessionMessage, StoreId } from "@quests/workspace/client";

import { SessionBuilder } from "./helpers";

const builder = new SessionBuilder();
const sessionId = builder.getSessionId();

const assistantMessageId = StoreId.newMessageId();

export const toolsInputStreamingSession: SessionMessage.WithParts[] = [
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
    ],
    role: "assistant",
  },
];
