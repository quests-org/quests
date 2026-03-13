import { describe, expect, it } from "vitest";

import { TOOLS_FOR_MODEL_OUTPUT } from "../../tools/all";
import { RelativePathSchema } from "../paths";
import { StoreId } from "../store-id";
import { SessionMessage } from "./message";

const mockDate = new Date("2024-01-01T10:00:00Z");

function baseMetadata() {
  const messageId = StoreId.newMessageId();
  const sessionId = StoreId.newSessionId();
  return {
    messageId,
    messageMetadata: {
      createdAt: mockDate,
      sessionId,
    },
    partMetadata: {
      createdAt: mockDate,
      id: StoreId.newPartId(),
      messageId,
      sessionId,
    },
    sessionId,
  };
}

describe("SessionMessage.toModelMessages", () => {
  it("excludes tool parts in input-available (preliminary) state", async () => {
    const { messageId, messageMetadata, partMetadata } = baseMetadata();

    const messages: SessionMessage.WithParts[] = [
      {
        id: messageId,
        metadata: {
          ...messageMetadata,
          aiGatewayModel: undefined,
          finishReason: "tool-calls",
          modelId: "gpt-4o",
          providerId: "openai",
        },
        parts: [
          {
            metadata: partMetadata,
            state: "done",
            text: "Let me read that file.",
            type: "text",
          },
          {
            callProviderMetadata: undefined,
            input: { filePath: "test.txt" },
            metadata: { ...partMetadata, toolName: "read_file" },
            providerExecuted: true,
            state: "input-available",
            toolCallId: StoreId.ToolCallSchema.parse("call_123"),
            type: "tool-read_file",
          },
        ],
        role: "assistant",
      },
    ];

    const result = await SessionMessage.toModelMessages(
      messages,
      TOOLS_FOR_MODEL_OUTPUT,
    );

    expect(result).toMatchInlineSnapshot(`
      [
        {
          "content": [
            {
              "text": "Let me read that file.",
              "type": "text",
            },
          ],
          "role": "assistant",
        },
      ]
    `);
  });

  it("excludes tool parts in input-streaming (preliminary) state", async () => {
    const { messageId, messageMetadata, partMetadata } = baseMetadata();

    const messages: SessionMessage.WithParts[] = [
      {
        id: messageId,
        metadata: {
          ...messageMetadata,
          aiGatewayModel: undefined,
          finishReason: "tool-calls",
          modelId: "gpt-4o",
          providerId: "openai",
        },
        parts: [
          {
            metadata: partMetadata,
            state: "done",
            text: "Thinking...",
            type: "text",
          },
          {
            input: undefined,
            metadata: { ...partMetadata, toolName: "read_file" },
            providerExecuted: false,
            state: "input-streaming",
            toolCallId: StoreId.ToolCallSchema.parse("call_456"),
            type: "tool-read_file",
          },
        ],
        role: "assistant",
      },
    ];

    const result = await SessionMessage.toModelMessages(
      messages,
      TOOLS_FOR_MODEL_OUTPUT,
    );

    expect(result).toMatchInlineSnapshot(`
      [
        {
          "content": [
            {
              "text": "Thinking...",
              "type": "text",
            },
          ],
          "role": "assistant",
        },
      ]
    `);
  });

  it("includes tool parts in output-available (preliminary) state", async () => {
    const { sessionId } = baseMetadata();

    const assistantMessageId = StoreId.newMessageId();
    const toolCallId = StoreId.ToolCallSchema.parse("call_789");

    const messages: SessionMessage.WithParts[] = [
      {
        id: assistantMessageId,
        metadata: {
          aiGatewayModel: undefined,
          createdAt: mockDate,
          finishReason: "tool-calls",
          modelId: "gpt-4o",
          providerId: "openai",
          sessionId,
        },
        parts: [
          {
            callProviderMetadata: undefined,
            input: { prompt: "Test task", subagent_type: "retrieval" },
            metadata: {
              createdAt: mockDate,
              endedAt: new Date("2024-01-01T10:01:00Z"),
              id: StoreId.newPartId(),
              messageId: assistantMessageId,
              sessionId,
              toolName: "task",
            },
            output: {
              sessionId,
              status: "running",
            },
            preliminary: true,
            providerExecuted: true,
            state: "output-available",
            toolCallId,
            type: "tool-task",
          },
        ],
        role: "assistant",
      },
    ];

    const result = await SessionMessage.toModelMessages(
      messages,
      TOOLS_FOR_MODEL_OUTPUT,
    );

    expect(result).toMatchInlineSnapshot(`
      [
        {
          "content": [
            {
              "input": {
                "prompt": "Test task",
                "subagent_type": "retrieval",
              },
              "providerExecuted": true,
              "toolCallId": "call_789",
              "toolName": "task",
              "type": "tool-call",
            },
            {
              "output": {
                "type": "text",
                "value": "Agent was stopped before it completed. Some tools may have been executed.",
              },
              "toolCallId": "call_789",
              "toolName": "task",
              "type": "tool-result",
            },
          ],
          "role": "assistant",
        },
      ]
    `);
  });

  it("includes tool parts in output-available state", async () => {
    const { sessionId } = baseMetadata();

    const assistantMessageId = StoreId.newMessageId();
    const toolCallId = StoreId.ToolCallSchema.parse("call_789");

    const messages: SessionMessage.WithParts[] = [
      {
        id: assistantMessageId,
        metadata: {
          aiGatewayModel: undefined,
          createdAt: mockDate,
          finishReason: "tool-calls",
          modelId: "gpt-4o",
          providerId: "openai",
          sessionId,
        },
        parts: [
          {
            callProviderMetadata: undefined,
            input: { filePath: "test.txt" },
            metadata: {
              createdAt: mockDate,
              endedAt: new Date("2024-01-01T10:01:00Z"),
              id: StoreId.newPartId(),
              messageId: assistantMessageId,
              sessionId,
              toolName: "read_file",
            },
            output: {
              content: "file contents",
              displayedLines: 1,
              filePath: RelativePathSchema.parse("test.txt"),
              hasMoreLines: false,
              offset: 0,
              state: "exists",
              totalLines: 1,
              truncatedByBytes: false,
            },
            providerExecuted: true,
            state: "output-available",
            toolCallId,
            type: "tool-read_file",
          },
        ],
        role: "assistant",
      },
    ];

    const result = await SessionMessage.toModelMessages(
      messages,
      TOOLS_FOR_MODEL_OUTPUT,
    );

    expect(result).toMatchInlineSnapshot(`
      [
        {
          "content": [
            {
              "input": {
                "filePath": "test.txt",
              },
              "providerExecuted": true,
              "toolCallId": "call_789",
              "toolName": "read_file",
              "type": "tool-call",
            },
            {
              "output": {
                "type": "text",
                "value": "<path>test.txt</path>
      <content>
         0→file contents
      </content>",
              },
              "toolCallId": "call_789",
              "toolName": "read_file",
              "type": "tool-result",
            },
          ],
          "role": "assistant",
        },
      ]
    `);
  });
});
