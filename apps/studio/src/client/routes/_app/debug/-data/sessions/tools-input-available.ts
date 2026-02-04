import { type SessionMessage, StoreId } from "@quests/workspace/client";

import { SessionBuilder } from "./helpers";

const builder = new SessionBuilder();
const sessionId = builder.getSessionId();

const assistantMessageId = StoreId.newMessageId();

export const toolsInputAvailableSession: SessionMessage.WithParts[] = [
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
      builder.toolPart(assistantMessageId, "input-available", {
        input: {
          content: "export const hello = 'world';",
          explanation: "Create a simple module file",
          filePath: "./src/hello.ts",
        },
        type: "tool-write_file",
      }),
    ],
    role: "assistant",
  },
];
