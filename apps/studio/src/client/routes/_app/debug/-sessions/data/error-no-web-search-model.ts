import { StoreId } from "@quests/workspace/client";

import {
  createDefaultAIGatewayModel,
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
      parts: [
        builder.textPart(
          "Search the web for the latest TypeScript 6.0 release notes",
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
              "User wants to find the latest TypeScript 6.0 release notes",
            query: "TypeScript 6.0 release notes",
          },
          output: {
            errorMessage:
              "No AI provider with web search capability is available.",
            errorType: "no-web-search-model",
            state: "failure",
          },
          type: "tool-web_search",
        }),
      ],
      role: "assistant",
    },
  ],
  name: "Error: No Web Search Model",
});
