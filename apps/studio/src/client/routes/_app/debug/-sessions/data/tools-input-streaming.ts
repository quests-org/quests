import { StoreId } from "@quests/workspace/client";

import { registerSession, SessionBuilder } from "../helpers";

const builder = new SessionBuilder();
const sessionId = builder.getSessionId();

const firstAssistantMessageId = StoreId.newMessageId();
const secondAssistantMessageId = StoreId.newMessageId();

registerSession({
  messages: [
    builder.userMessage(
      "Can you create a hello.ts file with a greeting function and also generate a sunset image?",
    ),
    {
      id: firstAssistantMessageId,
      metadata: {
        createdAt: builder.nextTime(),
        finishReason: "tool-calls",
        modelId: "claude-sonnet-4.5",
        providerId: "anthropic",
        sessionId,
      },
      parts: [
        builder.toolPart(firstAssistantMessageId, "input-streaming", {
          input: {
            content:
              "export function hello() {\n  console.log('Hello, world!');\n}",
            explanation: "Create a hello function",
            filePath: "./src/hello.ts",
          },
          type: "tool-write_file",
        }),
      ],
      role: "assistant",
    },
    builder.userMessage(
      "Great, now also generate the sunset image and update the greeting message.",
    ),
    {
      id: secondAssistantMessageId,
      metadata: {
        createdAt: builder.nextTime(),
        finishReason: "tool-calls",
        modelId: "claude-sonnet-4.5",
        providerId: "anthropic",
        sessionId,
      },
      parts: [
        builder.toolPart(secondAssistantMessageId, "input-streaming", {
          input: {
            explanation: "Generate a sunset image",
            filePath: "./images/sunset.png",
            prompt: "A beautiful sunset over mountains",
          },
          type: "tool-generate_image",
        }),
        builder.toolPart(secondAssistantMessageId, "input-streaming", {
          input: {
            content:
              "export function hello() {\n  console.log('Hello, world!');\n}",
            explanation: "Create a hello function",
            filePath: "./src/hello.ts",
          },
          type: "tool-write_file",
        }),
        builder.toolPart(secondAssistantMessageId, "input-streaming", {
          input: {
            explanation: "Update greeting message",
            filePath: "./src/hello.ts",
            newString: "  console.log('Hello, developer!');",
            oldString: "  console.log('Hello, world!');",
          },
          type: "tool-edit_file",
        }),
      ],
      role: "assistant",
    },
  ],
  name: "Tools: Input Streaming",
});
