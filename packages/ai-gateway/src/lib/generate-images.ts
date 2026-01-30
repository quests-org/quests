import { type ImageModelV3, type LanguageModelV3 } from "@ai-sdk/provider";
import { type WorkspaceServerURL } from "@quests/shared";
import { generateImage, generateText } from "ai";
import { Result } from "typescript-result";

import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import {
  createFireworksSDK,
  createGoogleSDK,
  createOpenAISDK,
  createOpenRouterSDK,
  createVercelSDK,
  createXAISDK,
} from "./ai-sdk-for-provider-config";

// Ordered by quality of image provider as of 2026-01-30
const ORDERED_PROVIDERS: AIGatewayProviderConfig.Type["type"][] = [
  "quests",
  "openrouter",
  "google",
  "openai",
  "x-ai",
  "vercel",
  "fireworks",
];

/* eslint-disable perfectionist/sort-sets */
const IMAGE_GENERATION_PROVIDERS = new Set<(typeof ORDERED_PROVIDERS)[number]>([
  "quests",
  "openrouter",
  "google",
  "openai",
  "vercel",
  "x-ai",
  "fireworks",
]);
/* eslint-enable perfectionist/sort-sets */

export async function generateImages({
  configs,
  count,
  preferredProviderConfig,
  prompt,
  signal,
  workspaceServerURL,
}: {
  configs: AIGatewayProviderConfig.Type[];
  count: number;
  preferredProviderConfig: AIGatewayProviderConfig.Type;
  prompt: string;
  signal: AbortSignal;
  workspaceServerURL: WorkspaceServerURL;
}) {
  // Try exact config by ID first
  const preferredConfig = configs.find(
    (c) => c.id === preferredProviderConfig.id,
  );
  if (preferredConfig && IMAGE_GENERATION_PROVIDERS.has(preferredConfig.type)) {
    const result = await tryGenerateWithConfig({
      config: preferredConfig,
      count,
      prompt,
      signal,
      workspaceServerURL,
    });
    if (result) {
      return result;
    }
  }

  // Fall back to type-based ordering
  const configsByType = new Map(configs.map((c) => [c.type, c]));

  const orderedProviderTypes = [
    ...(preferredConfig
      ? []
      : IMAGE_GENERATION_PROVIDERS.has(preferredProviderConfig.type)
        ? [preferredProviderConfig.type]
        : []),
    ...ORDERED_PROVIDERS.filter((type) => type !== preferredConfig?.type),
  ];

  for (const providerType of orderedProviderTypes) {
    const config = configsByType.get(providerType);
    if (!config) {
      continue;
    }

    const result = await tryGenerateWithConfig({
      config,
      count,
      prompt,
      signal,
      workspaceServerURL,
    });
    if (result) {
      return result;
    }
  }

  return Result.error("No provider with image generation support found");
}

async function tryGenerateWithConfig({
  config,
  count,
  prompt,
  signal,
  workspaceServerURL,
}: {
  config: AIGatewayProviderConfig.Type;
  count: number;
  prompt: string;
  signal: AbortSignal;
  workspaceServerURL: WorkspaceServerURL;
}) {
  let languageModel: LanguageModelV3 | undefined;
  // Providers that use generateText
  switch (config.type) {
    case "google": {
      const sdk = await createGoogleSDK(config, workspaceServerURL);
      languageModel = sdk("gemini-2.5-flash-image");
      break;
    }
    case "vercel": {
      const sdk = createVercelSDK(config, workspaceServerURL);
      languageModel = sdk("google/gemini-2.5-flash-image");
      break;
    }
  }

  if (languageModel) {
    const result = await generateText({
      abortSignal: signal,
      model: languageModel,
      prompt,
    });

    return Result.ok({
      images: result.files,
      modelId: languageModel.modelId,
      provider: config,
      usage: result.usage,
    });
  }

  // Providers that use generateImage
  let imageModel: ImageModelV3 | undefined;
  switch (config.type) {
    case "fireworks": {
      const sdk = await createFireworksSDK(config, workspaceServerURL);
      // cspell:ignore kontext
      imageModel = sdk.imageModel("accounts/fireworks/models/flux-kontext-pro");
      break;
    }
    case "openai": {
      const sdk = await createOpenAISDK(config, workspaceServerURL);
      imageModel = sdk.image("gpt-image-1-mini");
      break;
    }
    case "openrouter":
    case "quests": {
      const sdk = await createOpenRouterSDK(config, workspaceServerURL);
      imageModel = sdk.imageModel("google/gemini-2.5-flash-image");
      break;
    }
    case "x-ai": {
      const sdk = await createXAISDK(config, workspaceServerURL);
      imageModel = sdk.imageModel("grok-image-2");
      break;
    }
  }

  if (!imageModel) {
    return null;
  }

  const result = await generateImage({
    abortSignal: signal,
    model: imageModel,
    n: count,
    prompt,
  });

  return Result.ok({
    images: result.images,
    modelId: imageModel.modelId,
    provider: config,
    usage: result.usage,
  });
}
