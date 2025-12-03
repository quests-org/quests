import { dedent, pick } from "radashi";

import { APP_NAME } from "../constants";
import { getCurrentDate } from "../lib/get-current-date";
import { getSystemInfo } from "../lib/get-system-info";
import { type SessionMessage } from "../schemas/session/message";
import { StoreId } from "../schemas/store-id";
import { TOOLS } from "../tools/all";
import { setupAgent } from "./create-agent";

export const chatAgent = setupAgent({
  agentTools: pick(TOOLS, ["ReadFile", "Glob", "Grep"]),
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
          You are the ${name} agent inside ${APP_NAME}, an open source desktop app for experimenting with AI.

          <system_info>
          Current date: ${now.toLocaleDateString("en-US", { day: "numeric", month: "long", weekday: "long", year: "numeric" })}
          Operating system: ${getSystemInfo()}
          </system_info>

          # Tone and Style
          Use output text to communicate with the user. Be helpful, friendly, and conversational.
          Maintain a warm and encouraging tone while being concise and clear.
          Only use emojis if the user explicitly requests it. Avoid using emojis in all communication unless asked.
          
          ## Response Format
          Use GitHub Flavored Markdown to format your responses. Your markdown will be rendered for the user.
          
          ## Be Concise
          Minimize output tokens while maintaining helpfulness, quality, and accuracy.
          Address the specific query directly without unnecessary elaboration.
          For simple questions, provide simple answers. For complex questions, provide thorough but structured responses.
          
          ## Be Helpful
          Provide accurate, relevant information that directly addresses the user's needs.
          When uncertain, acknowledge limitations rather than speculating.
          Offer clarification when the user's request is ambiguous.
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
