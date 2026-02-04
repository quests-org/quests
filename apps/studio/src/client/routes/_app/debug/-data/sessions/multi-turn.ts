import { StoreId } from "@quests/workspace/client";

import { registerSession } from "./helpers";

const sessionId = StoreId.newSessionId();
const now = new Date();

registerSession({
  messages: [
  {
    id: StoreId.newMessageId(),
    metadata: {
      createdAt: now,
      sessionId,
    },
    parts: [
      {
        metadata: {
          createdAt: now,
          id: StoreId.newPartId(),
          messageId: StoreId.newMessageId(),
          sessionId,
        },
        state: "done",
        text: "What is React?",
        type: "text",
      },
    ],
    role: "user",
  },
  {
    id: StoreId.newMessageId(),
    metadata: {
      createdAt: new Date(now.getTime() + 1000),
      finishReason: "stop",
      modelId: "claude-sonnet-4.5",
      providerId: "anthropic",
      sessionId,
    },
    parts: [
      {
        metadata: {
          createdAt: new Date(now.getTime() + 1000),
          id: StoreId.newPartId(),
          messageId: StoreId.newMessageId(),
          sessionId,
        },
        state: "done",
        text: "React is a JavaScript library for building user interfaces, particularly single-page applications. It was developed by Facebook and allows developers to create reusable UI components.",
        type: "text",
      },
    ],
    role: "assistant",
  },
  {
    id: StoreId.newMessageId(),
    metadata: {
      createdAt: new Date(now.getTime() + 5000),
      sessionId,
    },
    parts: [
      {
        metadata: {
          createdAt: new Date(now.getTime() + 5000),
          id: StoreId.newPartId(),
          messageId: StoreId.newMessageId(),
          sessionId,
        },
        state: "done",
        text: "Can you show me a simple component example?",
        type: "text",
      },
    ],
    role: "user",
  },
  {
    id: StoreId.newMessageId(),
    metadata: {
      createdAt: new Date(now.getTime() + 6000),
      finishReason: "stop",
      modelId: "claude-sonnet-4.5",
      providerId: "anthropic",
      sessionId,
    },
    parts: [
      {
        metadata: {
          createdAt: new Date(now.getTime() + 6000),
          id: StoreId.newPartId(),
          messageId: StoreId.newMessageId(),
          sessionId,
        },
        state: "done",
        text: "Here's a simple React component:\n\n```tsx\nfunction Welcome({ name }: { name: string }) {\n  return <h1>Hello, {name}!</h1>;\n}\n```\n\nThis component accepts a `name` prop and displays a greeting.",
        type: "text",
      },
    ],
    role: "assistant",
  },
  {
    id: StoreId.newMessageId(),
    metadata: {
      createdAt: new Date(now.getTime() + 10_000),
      sessionId,
    },
    parts: [
      {
        metadata: {
          createdAt: new Date(now.getTime() + 10_000),
          id: StoreId.newPartId(),
          messageId: StoreId.newMessageId(),
          sessionId,
        },
        state: "done",
        text: "Thanks! That's helpful.",
        type: "text",
      },
    ],
    role: "user",
  },
  {
    id: StoreId.newMessageId(),
    metadata: {
      createdAt: new Date(now.getTime() + 11_000),
      finishReason: "stop",
      modelId: "claude-sonnet-4.5",
      providerId: "anthropic",
      sessionId,
    },
    parts: [
      {
        metadata: {
          createdAt: new Date(now.getTime() + 11_000),
          id: StoreId.newPartId(),
          messageId: StoreId.newMessageId(),
          sessionId,
        },
        state: "done",
        text: "You're welcome! Feel free to ask if you have any more questions about React.",
        type: "text",
      },
    ],
    role: "assistant",
  },
  ],
  name: "Multi-turn Conversation",
});
