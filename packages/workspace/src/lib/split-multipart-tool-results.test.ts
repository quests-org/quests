import type { ModelMessage } from "ai";

import { describe, expect, it } from "vitest";

import { splitMultipartToolResults } from "./split-multipart-tool-results";

describe("splitMultipartToolResults", () => {
  it("should pass through messages without tool results", () => {
    const messages: ModelMessage[] = [
      {
        content: "Hello",
        role: "user",
      },
      {
        content: "Hi there",
        role: "assistant",
      },
    ];

    const result = splitMultipartToolResults({
      messages,
      provider: "openrouter",
    });
    expect(result).toEqual(messages);
  });

  it("should pass through tool results without media", () => {
    const messages: ModelMessage[] = [
      {
        content: [
          {
            output: {
              type: "text",
              value: "File contents",
            },
            toolCallId: "call_123",
            toolName: "read_file",
            type: "tool-result",
          },
        ],
        role: "tool",
      },
    ];

    const result = splitMultipartToolResults({
      messages,
      provider: "openrouter",
    });
    expect(result).toEqual(messages);
  });

  it("should split multipart tool results with media into separate messages", () => {
    const messages: ModelMessage[] = [
      {
        content: [
          {
            output: {
              type: "content",
              value: [
                {
                  text: "Image file: test.png (image/png)",
                  type: "text",
                },
                {
                  data: "base64data",
                  mediaType: "image/png",
                  type: "media",
                },
              ],
            },
            toolCallId: "call_123",
            toolName: "read_file",
            type: "tool-result",
          },
        ],
        role: "tool",
      },
    ];

    const result = splitMultipartToolResults({
      messages,
      provider: "openrouter",
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      content: [
        {
          output: {
            type: "text",
            value: "Image file: test.png (image/png)",
          },
          toolCallId: "call_123",
          toolName: "read_file",
          type: "tool-result",
        },
      ],
      role: "tool",
    });
    expect(result[1]).toMatchInlineSnapshot(`
      {
        "content": [
          {
            "data": "base64data",
            "filename": "placeholder.png",
            "mediaType": "image/png",
            "type": "file",
          },
        ],
        "role": "user",
      }
    `);
  });

  it("should handle multiple tool results in same message", () => {
    const messages: ModelMessage[] = [
      {
        content: [
          {
            output: {
              type: "text",
              value: "Text file contents",
            },
            toolCallId: "call_1",
            toolName: "read_file",
            type: "tool-result",
          },
          {
            output: {
              type: "content",
              value: [
                {
                  text: "Image file: test.png",
                  type: "text",
                },
                {
                  data: "base64data",
                  mediaType: "image/png",
                  type: "media",
                },
              ],
            },
            toolCallId: "call_2",
            toolName: "read_file",
            type: "tool-result",
          },
        ],
        role: "tool",
      },
    ];

    const result = splitMultipartToolResults({
      messages,
      provider: "openrouter",
    });

    expect(result).toHaveLength(2);
    expect(result[0]?.role).toBe("tool");
    expect(result[0]?.content).toHaveLength(2);
    expect(result[1]?.role).toBe("user");
    expect(result[1]?.content).toHaveLength(1);
  });

  it("should handle empty text parts", () => {
    const messages: ModelMessage[] = [
      {
        content: [
          {
            output: {
              type: "content",
              value: [
                {
                  data: "base64data",
                  mediaType: "image/png",
                  type: "media",
                },
              ],
            },
            toolCallId: "call_123",
            toolName: "read_file",
            type: "tool-result",
          },
        ],
        role: "tool",
      },
    ];

    const result = splitMultipartToolResults({
      messages,
      provider: "openrouter",
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      content: [
        {
          output: {
            type: "text",
            value: "",
          },
          toolCallId: "call_123",
          toolName: "read_file",
          type: "tool-result",
        },
      ],
      role: "tool",
    });
    expect(result[1]).toMatchInlineSnapshot(`
      {
        "content": [
          {
            "data": "base64data",
            "filename": "placeholder.png",
            "mediaType": "image/png",
            "type": "file",
          },
        ],
        "role": "user",
      }
    `);
  });

  it("should handle multiple text parts", () => {
    const messages: ModelMessage[] = [
      {
        content: [
          {
            output: {
              type: "content",
              value: [
                {
                  text: "First text",
                  type: "text",
                },
                {
                  text: "Second text",
                  type: "text",
                },
                {
                  data: "base64data",
                  mediaType: "image/png",
                  type: "media",
                },
              ],
            },
            toolCallId: "call_123",
            toolName: "read_file",
            type: "tool-result",
          },
        ],
        role: "tool",
      },
    ];

    const result = splitMultipartToolResults({
      messages,
      provider: "openrouter",
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      content: [
        {
          output: {
            type: "text",
            value: "First text\nSecond text",
          },
          toolCallId: "call_123",
          toolName: "read_file",
          type: "tool-result",
        },
      ],
      role: "tool",
    });
  });

  it("should preserve message order", () => {
    const messages: ModelMessage[] = [
      {
        content: "User message 1",
        role: "user",
      },
      {
        content: [
          {
            output: {
              type: "content",
              value: [
                {
                  text: "Image file",
                  type: "text",
                },
                {
                  data: "base64",
                  mediaType: "image/png",
                  type: "media",
                },
              ],
            },
            toolCallId: "call_1",
            toolName: "read_file",
            type: "tool-result",
          },
        ],
        role: "tool",
      },
      {
        content: "User message 2",
        role: "user",
      },
    ];

    const result = splitMultipartToolResults({
      messages,
      provider: "openrouter",
    });

    expect(result).toHaveLength(4);
    expect(result[0]?.role).toBe("user");
    expect(result[0]?.content).toBe("User message 1");
    expect(result[1]?.role).toBe("tool");
    expect(result[2]?.role).toBe("user");
    expect(result[2]?.content).not.toBe("User message 2");
    expect(result[3]?.role).toBe("user");
    expect(result[3]?.content).toBe("User message 2");
  });

  it("should not split multipart tool results for supported providers", () => {
    const messages: ModelMessage[] = [
      {
        content: [
          {
            output: {
              type: "content",
              value: [
                {
                  text: "Image file: test.png (image/png)",
                  type: "text",
                },
                {
                  data: "base64data",
                  mediaType: "image/png",
                  type: "media",
                },
              ],
            },
            toolCallId: "call_123",
            toolName: "read_file",
            type: "tool-result",
          },
        ],
        role: "tool",
      },
    ];

    const result = splitMultipartToolResults({
      messages,
      provider: "anthropic",
    });

    expect(result).toEqual(messages);
  });
});
