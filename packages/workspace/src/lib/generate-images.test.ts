import { type AIGatewayProviderConfig } from "@quests/ai-gateway";
import {
  type AIProviderConfigId,
  type WorkspaceServerURL,
} from "@quests/shared";
import { describe, expect, it, vi } from "vitest";

import { generateImages } from "./generate-images";

vi.mock("ai", () => ({
  generateImage: vi.fn(),
  generateText: vi.fn(),
}));

vi.mock("@quests/ai-gateway", async () => {
  const actual =
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    await vi.importActual<typeof import("@quests/ai-gateway")>(
      "@quests/ai-gateway",
    );
  return {
    ...actual,
    fetchAISDKImageModel: vi.fn(),
  };
});

const createMockConfig = ({
  id,
  type,
}: {
  id: string;
  type: AIGatewayProviderConfig.Type["type"];
}): AIGatewayProviderConfig.Type => {
  const baseConfig = {
    cacheIdentifier: `cache-${id}`,
    id: id as AIProviderConfigId,
    name: `${type} Config`,
    type,
  };

  switch (type) {
    case "fireworks": {
      return { ...baseConfig, apiKey: "test-key", type: "fireworks" };
    }
    case "google": {
      return { ...baseConfig, apiKey: "test-key", type: "google" };
    }
    case "openai": {
      return { ...baseConfig, apiKey: "test-key", type: "openai" };
    }
    case "openrouter": {
      return { ...baseConfig, apiKey: "test-key", type: "openrouter" };
    }
    case "quests": {
      return { ...baseConfig, apiKey: "NOT_NEEDED", type: "quests" };
    }
    case "vercel": {
      return { ...baseConfig, apiKey: "test-key", type: "vercel" };
    }
    case "x-ai": {
      return { ...baseConfig, apiKey: "test-key", type: "x-ai" };
    }
    default: {
      throw new Error(`Unsupported type: ${type}`);
    }
  }
};

describe("generateImages", () => {
  const mockSignal = new AbortController().signal;
  const mockWorkspaceServerURL = "http://localhost:3000" as WorkspaceServerURL;
  const mockWorkspaceConfig = {
    captureException: vi.fn(),
  } as never;

  it.each([
    {
      configs: [
        createMockConfig({ id: "openai-1", type: "openai" }),
        createMockConfig({ id: "openai-2", type: "openai" }),
        createMockConfig({ id: "google-1", type: "google" }),
      ],
      description: "prefers exact config by ID over type",
      expectedConfigId: "openai-2",
      preferredConfig: createMockConfig({ id: "openai-2", type: "openai" }),
    },
    {
      configs: [
        createMockConfig({ id: "openai-1", type: "openai" }),
        createMockConfig({ id: "google-1", type: "google" }),
        createMockConfig({ id: "quests-1", type: "quests" }),
      ],
      description: "falls back to type when ID not found",
      expectedConfigId: "google-1",
      preferredConfig: createMockConfig({ id: "google-999", type: "google" }),
    },
    {
      configs: [
        createMockConfig({ id: "openai-1", type: "openai" }),
        createMockConfig({ id: "google-1", type: "google" }),
      ],
      description: "uses automatic ordering when preferred not available",
      expectedConfigId: "google-1",
      preferredConfig: createMockConfig({ id: "quests-999", type: "quests" }),
    },
    {
      configs: [
        createMockConfig({ id: "fireworks-1", type: "fireworks" }),
        createMockConfig({ id: "openai-1", type: "openai" }),
        createMockConfig({ id: "quests-1", type: "quests" }),
      ],
      description: "prioritizes quests in automatic ordering",
      expectedConfigId: "quests-1",
      preferredConfig: createMockConfig({ id: "vercel-999", type: "vercel" }),
    },
    {
      configs: [
        createMockConfig({ id: "openrouter-1", type: "openrouter" }),
        createMockConfig({ id: "openrouter-2", type: "openrouter" }),
      ],
      description: "uses exact ID when multiple configs of same type exist",
      expectedConfigId: "openrouter-2",
      preferredConfig: createMockConfig({
        id: "openrouter-2",
        type: "openrouter",
      }),
    },
  ])("$description", async ({ configs, expectedConfigId, preferredConfig }) => {
    const { fetchAISDKImageModel } = await import("@quests/ai-gateway");
    const { generateImage, generateText } = await import("ai");

    const mockImageModel = {
      modelId: "test-model",
    };

    vi.mocked(fetchAISDKImageModel).mockResolvedValue({
      ok: true,
      toTuple: () => [{ model: mockImageModel, type: "image" }, null],
      value: { model: mockImageModel, type: "image" },
    } as never);

    vi.mocked(generateText).mockResolvedValue({
      files: [],
      text: "test",
      usage: { completionTokens: 0, promptTokens: 0, totalTokens: 0 },
    } as never);

    vi.mocked(generateImage).mockResolvedValue({
      images: [],
      usage: { completionTokens: 0, promptTokens: 0, totalTokens: 0 },
    } as never);

    const result = await generateImages({
      configs,
      count: 1,
      preferredProviderConfig: preferredConfig,
      prompt: "test prompt",
      signal: mockSignal,
      workspaceConfig: mockWorkspaceConfig,
      workspaceServerURL: mockWorkspaceServerURL,
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.provider.id).toBe(expectedConfigId);
    }
  });

  it("returns error when no image generation providers available", async () => {
    const result = await generateImages({
      configs: [],
      count: 1,
      preferredProviderConfig: createMockConfig({
        id: "openai-1",
        type: "openai",
      }),
      prompt: "test prompt",
      signal: mockSignal,
      workspaceConfig: mockWorkspaceConfig,
      workspaceServerURL: mockWorkspaceServerURL,
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toBe(
        "No provider with image generation support found",
      );
      expect(result.error.type).toBe("workspace-no-image-model-error");
    }
  });
});
