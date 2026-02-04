import { type SessionMessage, StoreId } from "@quests/workspace/client";

import { SessionBuilder } from "./helpers";

const builder = new SessionBuilder();
const sessionId = builder.getSessionId();

const assistantMessageId = StoreId.newMessageId();

export const toolsOutputAvailableSession: SessionMessage.WithParts[] = [
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
      builder.textPart("I'll create that file now.", assistantMessageId),
      builder.toolPart(assistantMessageId, "output-available", {
        input: {
          content: "export const config = { api: 'https://example.com' };",
          explanation: "Create configuration file",
          filePath: "./src/config.ts",
        },
        output: {
          filePath: "./src/config.ts",
        },
        type: "tool-write_file",
      }),
    ],
    role: "assistant",
  },
];
