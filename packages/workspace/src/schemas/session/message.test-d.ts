import { assertType, describe, expectTypeOf, it } from "vitest";

import { StoreId } from "../store-id";
import { type SessionMessage } from "./message";

const METADATA = {
  createdAt: new Date(),
  finishReason: "unknown" as const,
  modelId: "test-model-id",
  provider: "test-provider",
  sessionId: StoreId.newSessionId(),
  usage: {
    cachedInputTokens: 100,
    inputTokens: 100,
    outputTokens: 100,
    reasoningTokens: 100,
    totalTokens: 100,
  },
};

describe("SessionMessage", () => {
  it("has strongly typed metadata", () => {
    assertType<SessionMessage.WithParts>({
      id: StoreId.newMessageId(),
      metadata: METADATA,
      parts: [
        {
          metadata: {
            createdAt: new Date(),
            id: StoreId.newPartId(),
            messageId: StoreId.newMessageId(),
            sessionId: StoreId.newSessionId(),
          },
          text: "test content",
          type: "text",
        },
      ],
      role: "user",
    });
  });

  it("has strongly typed data parts", () => {
    assertType<SessionMessage.WithParts>({
      id: StoreId.newMessageId(),
      metadata: METADATA,
      parts: [
        {
          data: {
            ref: "abc123",
            restoredFromRef: "def456",
          },
          metadata: {
            createdAt: new Date(),
            id: StoreId.newPartId(),
            messageId: StoreId.newMessageId(),
            sessionId: StoreId.newSessionId(),
          },
          type: "data-gitCommit",
        },
      ],
      role: "user",
    });
  });

  it("throws error for invalid tool parts", () => {
    expectTypeOf({
      input: {
        invalid: "test",
      },
      output: {
        invalid: "test",
      },
      state: "output-available",
      toolCallId: "call_123",
      type: "tool-read_file",
    }).not.toEqualTypeOf<SessionMessage.WithParts>();
  });
});
