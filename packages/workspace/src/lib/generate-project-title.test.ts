import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";

import { StoreId } from "../schemas/store-id";
import { ProjectSubdomainSchema } from "../schemas/subdomains";
import { createMockAIGatewayModel } from "../test/helpers/mock-ai-gateway-model";
import { createMockAppConfig } from "../test/helpers/mock-app-config";
import { generateProjectTitle } from "./generate-project-title";

function createMockLanguageModel(text: string) {
  return new MockLanguageModelV3({
    doGenerate: () =>
      Promise.resolve({
        content: [{ text, type: "text" }],
        finishReason: { raw: "stop", unified: "stop" },
        usage: {
          inputTokens: {
            cacheRead: undefined,
            cacheWrite: undefined,
            noCache: undefined,
            total: 10,
          },
          outputTokens: {
            reasoning: undefined,
            text: undefined,
            total: 15,
          },
        },
        warnings: [],
      }),
  });
}

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

const mockMessage = createMockMessage("Build a todo app");

function setupTest(generatedText: string) {
  const mockLanguageModel = createMockLanguageModel(generatedText);
  const model = createMockAIGatewayModel();
  const appConfig = createMockAppConfig(ProjectSubdomainSchema.parse("mock"), {
    aiSDKModel: mockLanguageModel,
    model,
  });

  return {
    generate: (message = mockMessage) =>
      generateProjectTitle({
        message,
        model,
        workspaceConfig: appConfig.workspaceConfig,
      }),
  };
}

describe("generateProjectTitle", () => {
  it("should limit generated title to 5 words maximum", async () => {
    const { generate } = setupTest(
      "Very Long Project Title That Exceeds The Five Word Limit",
    );

    const result = await generate();
    const title = result._unsafeUnwrap();

    expect(title.split(" ")).toHaveLength(5);
    expect(title).toBe("Very Long Project Title That");
  });

  it("should preserve titles with 5 words or fewer", async () => {
    const { generate } = setupTest("Todo List Manager");

    const result = await generate();
    const title = result._unsafeUnwrap();

    expect(title.split(" ")).toHaveLength(3);
    expect(title).toBe("Todo List Manager");
  });

  it("should handle exactly 5 words", async () => {
    const { generate } = setupTest("Chat With File Upload System");

    const result = await generate();
    const title = result._unsafeUnwrap();

    expect(title.split(" ")).toHaveLength(5);
    expect(title).toBe("Chat With File Upload System");
  });

  it("should handle single word titles", async () => {
    const { generate } = setupTest("Todos");

    const result = await generate();
    const title = result._unsafeUnwrap();

    expect(title.split(" ")).toHaveLength(1);
    expect(title).toBe("Todos");
  });

  it("should handle empty message gracefully", async () => {
    const { generate } = setupTest("Default Title");
    const emptyMessage = createMockMessage("");

    const result = await generate(emptyMessage);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toMatchInlineSnapshot(
      `"Failed to generate project title: No user message"`,
    );
  });

  it("should trim whitespace from generated title", async () => {
    const { generate } = setupTest("  Todo Manager  ");

    const result = await generate();
    const title = result._unsafeUnwrap();

    expect(title).toBe("Todo Manager");
  });

  it("should handle non-English characters", async () => {
    // cspell:ignore تطبيق المهام اليومية
    const { generate } = setupTest("تطبيق المهام اليومية");

    const result = await generate();
    const title = result._unsafeUnwrap();

    expect(title).toBe("تطبيق المهام اليومية");
  });

  it("should limit non-English titles to 5 words", async () => {
    const { generate } = setupTest(
      "システム 管理 アプリケーション データベース 設定 追加",
    );

    const result = await generate();
    const title = result._unsafeUnwrap();

    expect(title.split(" ")).toHaveLength(5);
    expect(title).toBe("システム 管理 アプリケーション データベース 設定");
  });

  it("should handle mixed language titles", async () => {
    const { generate } = setupTest("Chat アプリ with ファイル upload");

    const result = await generate();
    const title = result._unsafeUnwrap();

    expect(title.split(" ")).toHaveLength(5);
    expect(title).toBe("Chat アプリ with ファイル upload");
  });
});
