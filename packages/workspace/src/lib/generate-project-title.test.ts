import { MockLanguageModelV2 } from "ai/test";
import { describe, expect, it } from "vitest";

import { StoreId } from "../schemas/store-id";
import { generateProjectTitle } from "./generate-project-title";

function createMockMessage(text: string) {
  return {
    id: StoreId.newMessageId(),
    metadata: {
      createdAt: new Date(),
      sessionId: StoreId.newSessionId(),
    },
    parts: [
      {
        metadata: {
          createdAt: new Date(),
          id: StoreId.newPartId(),
          messageId: StoreId.newMessageId(),
          sessionId: StoreId.newSessionId(),
        },
        text,
        type: "text" as const,
      },
    ],
    role: "user" as const,
  };
}

function createMockModel(text: string) {
  return new MockLanguageModelV2({
    doGenerate: () =>
      Promise.resolve({
        content: [{ text, type: "text" }],
        finishReason: "stop",
        usage: {
          cachedInputTokens: 0,
          inputTokens: 10,
          outputTokens: 15,
          reasoningTokens: 0,
          totalTokens: 25,
        },
        warnings: [],
      }),
  });
}

const mockMessage = createMockMessage("Build a todo app");

describe("generateProjectTitle", () => {
  it("should limit generated title to 5 words maximum", async () => {
    const model = createMockModel(
      "Very Long Project Title That Exceeds The Five Word Limit",
    );

    const result = await generateProjectTitle({ message: mockMessage, model });
    const title = result._unsafeUnwrap();

    expect(title.split(" ")).toHaveLength(5);
    expect(title).toBe("Very Long Project Title That");
  });

  it("should preserve titles with 5 words or fewer", async () => {
    const model = createMockModel("Todo List Manager");

    const result = await generateProjectTitle({ message: mockMessage, model });
    const title = result._unsafeUnwrap();

    expect(title.split(" ")).toHaveLength(3);
    expect(title).toBe("Todo List Manager");
  });

  it("should handle exactly 5 words", async () => {
    const model = createMockModel("Chat With File Upload System");

    const result = await generateProjectTitle({ message: mockMessage, model });
    const title = result._unsafeUnwrap();

    expect(title.split(" ")).toHaveLength(5);
    expect(title).toBe("Chat With File Upload System");
  });

  it("should handle single word titles", async () => {
    const model = createMockModel("Todos");

    const result = await generateProjectTitle({ message: mockMessage, model });
    const title = result._unsafeUnwrap();

    expect(title.split(" ")).toHaveLength(1);
    expect(title).toBe("Todos");
  });

  it("should handle empty message gracefully", async () => {
    const model = createMockModel("Default Title");
    const emptyMessage = createMockMessage("");

    const result = await generateProjectTitle({ message: emptyMessage, model });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toMatchInlineSnapshot(
      `"Failed to generate project title: No user message"`,
    );
  });

  it("should trim whitespace from generated title", async () => {
    const model = createMockModel("  Todo Manager  ");

    const result = await generateProjectTitle({ message: mockMessage, model });
    const title = result._unsafeUnwrap();

    expect(title).toBe("Todo Manager");
  });

  it("should handle non-English characters", async () => {
    // cspell:ignore تطبيق المهام اليومية
    const model = createMockModel("تطبيق المهام اليومية");

    const result = await generateProjectTitle({ message: mockMessage, model });
    const title = result._unsafeUnwrap();

    expect(title).toBe("تطبيق المهام اليومية");
  });

  it("should limit non-English titles to 5 words", async () => {
    const model = createMockModel(
      "システム 管理 アプリケーション データベース 設定 追加",
    );

    const result = await generateProjectTitle({ message: mockMessage, model });
    const title = result._unsafeUnwrap();

    expect(title.split(" ")).toHaveLength(5);
    expect(title).toBe("システム 管理 アプリケーション データベース 設定");
  });

  it("should handle mixed language titles", async () => {
    const model = createMockModel("Chat アプリ with ファイル upload");

    const result = await generateProjectTitle({ message: mockMessage, model });
    const title = result._unsafeUnwrap();

    expect(title.split(" ")).toHaveLength(5);
    expect(title).toBe("Chat アプリ with ファイル upload");
  });
});
