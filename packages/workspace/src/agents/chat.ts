import { dedent } from "radashi";

import { APP_NAME } from "../constants";
import { getCurrentDate } from "../lib/get-current-date";
import { type SessionMessage } from "../schemas/session/message";
import { StoreId } from "../schemas/store-id";
import { setupAgent } from "./create-agent";

export const chatAgent = setupAgent({
  agentTools: {},
  name: "chat",
}).create(({ name }) => ({
  getMessages: ({ sessionId }) => {
    const now = getCurrentDate();
    const systemMessageId = StoreId.newMessageId();
    const systemMessage: SessionMessage.ContextWithParts = {
      id: systemMessageId,
      metadata: {
        agentName: name,
        createdAt: now,
        realRole: "system",
        sessionId,
      },
      parts: [
        {
          metadata: {
            createdAt: now,
            endedAt: now,
            id: StoreId.newPartId(),
            messageId: systemMessageId,
            sessionId,
          },
          state: "done",
          text: dedent`
          You are a helpful AI assistant in ${APP_NAME}.

          # Tone and style
          Use output text to communicate with the user. Be helpful, friendly, and conversational.
          Only use emojis if the user explicitly requests it. Avoid using emojis in all communication unless asked.
          Be concise and minimize output tokens while maintaining helpfulness, quality, and accuracy.
          `.trim(),
          type: "text",
        },
      ],
      role: "session-context",
    };

    return Promise.resolve([systemMessage]);
  },
  onFinish: async () => {
    // no-op
  },
  onStart: async () => {
    // no-op
  },
  shouldContinue: () => {
    return Promise.resolve(false);
  },
}));
