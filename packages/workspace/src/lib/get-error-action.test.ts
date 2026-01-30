import { type AIProviderType } from "@quests/shared";
import { describe, expect, it } from "vitest";

import { type SessionMessage } from "../schemas/session/message";
import { StoreId } from "../schemas/store-id";
import { createMockAIGatewayModel } from "../test/helpers/mock-ai-gateway-model";
import { getErrorAction } from "./get-error-action";

const createMessage = (
  error?: SessionMessage.Assistant["metadata"]["error"],
  provider?: AIProviderType,
): SessionMessage.Assistant => ({
  id: StoreId.newMessageId(),
  metadata: {
    aiGatewayModel: createMockAIGatewayModel({ provider }),
    createdAt: new Date(),
    error,
    finishReason: "stop",
    modelId: "test-model",
    providerId: "test-provider",
    sessionId: StoreId.newSessionId(),
  },
  role: "assistant",
});

describe("getErrorAction", () => {
  it("returns continue when no error", () => {
    const message = createMessage();
    expect(getErrorAction(message)).toEqual({ type: "continue" });
  });

  it("returns stop for aborted errors", () => {
    const message = createMessage({ kind: "aborted", message: "Aborted" });
    expect(getErrorAction(message)).toEqual({ type: "stop" });
  });

  it("returns error for unknown errors", () => {
    const message = createMessage({ kind: "unknown", message: "Test error" });
    const result = getErrorAction(message);
    expect(result.type).toBe("error");
    if (result.type === "error") {
      expect(result.error.message).toBe("Test error");
    }
  });

  it("returns retry for no-such-tool errors", () => {
    const message = createMessage({
      kind: "no-such-tool",
      message: "Tool not found",
      toolName: "test-tool",
    });
    expect(getErrorAction(message)).toEqual({ type: "retry" });
  });

  it("returns retry for invalid-tool-input errors", () => {
    const message = createMessage({
      input: "invalid input",
      kind: "invalid-tool-input",
      message: "Invalid input",
    });
    expect(getErrorAction(message)).toEqual({ type: "retry" });
  });

  describe("api-call errors", () => {
    describe("quests provider", () => {
      it("returns retry when no response body", () => {
        const message = createMessage(
          {
            kind: "api-call",
            message: "API call failed",
            name: "APIError",
            url: "https://example.com",
          },
          "quests",
        );
        expect(getErrorAction(message)).toEqual({ type: "retry" });
      });

      it("returns retry when response body is invalid JSON", () => {
        const message = createMessage(
          {
            kind: "api-call",
            message: "API call failed",
            name: "APIError",
            responseBody: "invalid json",
            url: "https://example.com",
          },
          "quests",
        );
        expect(getErrorAction(message)).toEqual({ type: "retry" });
      });

      it("returns retry when error.retryable is not present", () => {
        const message = createMessage(
          {
            kind: "api-call",
            message: "API call failed",
            name: "APIError",
            responseBody: JSON.stringify({}),
            url: "https://example.com",
          },
          "quests",
        );
        expect(getErrorAction(message)).toEqual({ type: "retry" });
      });

      it("returns stop when error.retryable is false", () => {
        const message = createMessage(
          {
            kind: "api-call",
            message: "API call failed",
            name: "APIError",
            responseBody: JSON.stringify({
              error: {
                code: "insufficient-credits",
                message: "Insufficient credits",
                retryable: false,
              },
            }),
            url: "https://example.com",
          },
          "quests",
        );
        expect(getErrorAction(message)).toEqual({ type: "stop" });
      });

      it("returns retry when error.retryable is true", () => {
        const message = createMessage(
          {
            kind: "api-call",
            message: "API call failed",
            name: "APIError",
            responseBody: JSON.stringify({
              error: {
                code: "internal-server-error",
                message: "Internal server error",
                retryable: true,
              },
            }),
            url: "https://example.com",
          },
          "quests",
        );
        expect(getErrorAction(message)).toEqual({ type: "retry" });
      });
    });

    describe("non-quest provider", () => {
      it("returns retry for api-call errors", () => {
        const message = createMessage(
          {
            kind: "api-call",
            message: "API call failed",
            name: "APIError",
            url: "https://example.com",
          },
          "openai",
        );
        expect(getErrorAction(message)).toEqual({ type: "retry" });
      });

      it("returns retry when no provider specified", () => {
        const message = createMessage({
          kind: "api-call",
          message: "API call failed",
          name: "APIError",
          url: "https://example.com",
        });
        expect(getErrorAction(message)).toEqual({ type: "retry" });
      });
    });
  });

  it("returns stop for unknown error kinds", () => {
    const message = createMessage({ kind: "other" } as never);
    expect(getErrorAction(message)).toEqual({ type: "stop" });
  });
});
