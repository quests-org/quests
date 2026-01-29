import { describe, expect, it } from "vitest";

import { RelativePathSchema } from "../paths";
import { StoreId } from "../store-id";
import { SessionMessageRelaxedPart } from "./message-relaxed-part";

describe("SessionMessageRelaxedPart", () => {
  // Shared metadata for all parts
  const baseMetadata = {
    createdAt: new Date("2024-01-01T10:00:00Z"),
    id: StoreId.newPartId(),
    messageId: StoreId.newMessageId(),
    sessionId: StoreId.newSessionId(),
  };

  const providerMetadata = {
    openai: {
      model: "mock-model-id",
      providerId: "mock-provider-id",
      usage: { tokens: 100 },
    },
  };

  const testCases: { data: SessionMessageRelaxedPart.Type; name: string }[] = [
    {
      data: {
        metadata: baseMetadata,
        providerMetadata,
        state: "streaming",
        text: "Hello world",
        type: "text",
      },
      name: "TextUIPart - streaming",
    },
    {
      data: {
        metadata: {
          ...baseMetadata,
          endedAt: new Date("2024-01-01T10:01:00Z"),
        },
        providerMetadata,
        state: "done",
        text: "Hello world",
        type: "text",
      },
      name: "TextUIPart - done",
    },
    {
      data: {
        metadata: baseMetadata,
        providerMetadata,
        state: "streaming",
        text: "Let me think about this...",
        type: "reasoning",
      },
      name: "ReasoningUIPart - streaming",
    },
    {
      data: {
        metadata: {
          ...baseMetadata,
          endedAt: new Date("2024-01-01T10:01:00Z"),
        },
        providerMetadata,
        state: "done",
        text: "Let me think about this...",
        type: "reasoning",
      },
      name: "ReasoningUIPart - done",
    },
    {
      data: {
        metadata: baseMetadata,
        providerMetadata,
        sourceId: "src_123",
        title: "Example Page",
        type: "source-url",
        url: "https://example.com",
      },
      name: "SourceUrlUIPart",
    },
    {
      data: {
        filename: "document.pdf",
        mediaType: "application/pdf",
        metadata: baseMetadata,
        providerMetadata,
        sourceId: "doc_123",
        title: "Important Document",
        type: "source-document",
      },
      name: "SourceDocumentUIPart",
    },
    {
      data: {
        filename: "file.pdf",
        mediaType: "application/pdf",
        metadata: baseMetadata,
        providerMetadata,
        type: "file",
        url: "https://example.com/file.pdf",
      },
      name: "FileUIPart",
    },
    {
      data: {
        metadata: {
          ...baseMetadata,
          stepCount: 1,
        },
        type: "step-start",
      },
      name: "StepStartUIPart",
    },
    {
      data: {
        data: { key: "value", number: 42 },
        id: "data_123",
        metadata: {
          ...baseMetadata,
          dataPartName: "gitCommit",
        },
        type: "data-custom",
      },
      name: "DataUIPart",
    },
    {
      data: {
        input: undefined,
        metadata: {
          ...baseMetadata,
          toolName: "read_file",
        },
        providerExecuted: false,
        state: "input-streaming",
        toolCallId: StoreId.ToolCallSchema.parse("call_123"),
        type: "tool-read_file",
      },
      name: "ToolUIPart - input-streaming",
    },
    {
      data: {
        callProviderMetadata: providerMetadata,
        input: { filePath: "test.txt" },
        metadata: {
          ...baseMetadata,
          toolName: "read_file",
        },
        providerExecuted: true,
        state: "input-available",
        toolCallId: StoreId.ToolCallSchema.parse("call_123"),
        type: "tool-read_file",
      },
      name: "ToolUIPart - input-available",
    },
    {
      data: {
        callProviderMetadata: providerMetadata,
        input: { filePath: "test.txt" },
        metadata: {
          ...baseMetadata,
          endedAt: new Date("2024-01-01T10:01:00Z"),
          toolName: "read_file",
        },
        output: {
          content: "file contents",
          displayedLines: 1,
          filePath: RelativePathSchema.parse("test.txt"),
          hasMoreLines: false,
          offset: 0,
          state: "exists",
        },
        providerExecuted: true,
        state: "output-available",
        toolCallId: "call_123",
        type: "tool-read_file",
      },
      name: "ToolUIPart - output-available",
    },
    {
      data: {
        callProviderMetadata: providerMetadata,
        errorText: "File not found",
        input: { filePath: "nonexistent.txt" },
        metadata: {
          ...baseMetadata,
          endedAt: new Date("2024-01-01T10:01:00Z"),
          toolName: "read_file",
        },
        providerExecuted: true,
        state: "output-error",
        toolCallId: StoreId.ToolCallSchema.parse("call_123"),
        type: "tool-read_file",
      },
      name: "ToolUIPart - output-error",
    },
  ];

  it.each(testCases)("should parse $name successfully", ({ data }) => {
    const result = SessionMessageRelaxedPart.Schema.parse(data);
    expect(result).toEqual(data);
  });
});
