import {
  type AIGatewayProviderConfig,
  getAISDKImageModel,
  getAllProviderMetadata,
  getProviderMetadata,
} from "@quests/ai-gateway";
import { type WorkspaceServerURL } from "@quests/shared";
import { generateImage, generateText } from "ai";
import { err, ResultAsync } from "neverthrow";

import { type WorkspaceConfig } from "../types";
import { TypedError } from "./errors";

function supportsImageGeneration(type: AIGatewayProviderConfig.Type["type"]) {
  const metadata = getProviderMetadata(type);
  return metadata.tags.includes("imageGeneration");
}

const IMAGE_GENERATION_PROVIDERS = getAllProviderMetadata()
  .filter((metadata) => metadata.tags.includes("imageGeneration"))
  .map((metadata) => metadata.type)
  .sort((a, b) => {
    const order = [
      // Ordered by quality as of 2026-01-30
      "quests",
      "openrouter",
      "google",
      "openai",
      "x-ai",
      "vercel",
      "fireworks",
    ];
    return order.indexOf(a) - order.indexOf(b);
  });

export async function generateImages({
  configs,
  count,
  preferredProviderConfig,
  prompt,
  signal,
  workspaceConfig,
  workspaceServerURL,
}: {
  configs: AIGatewayProviderConfig.Type[];
  count: number;
  preferredProviderConfig: AIGatewayProviderConfig.Type;
  prompt: string;
  signal: AbortSignal;
  workspaceConfig: WorkspaceConfig;
  workspaceServerURL: WorkspaceServerURL;
}) {
  // Build ordered list of up to 2 configs to try
  const configsToTry: AIGatewayProviderConfig.Type[] = [];

  // 1. Try exact ID match first
  const exactMatch = configs.find(
    (c) =>
      c.id === preferredProviderConfig.id && supportsImageGeneration(c.type),
  );
  if (exactMatch) {
    configsToTry.push(exactMatch);
  }

  // 2. Try type match if no exact match
  if (!exactMatch) {
    const configsByType = new Map(configs.map((c) => [c.type, c]));
    const typeMatch = configsByType.get(preferredProviderConfig.type);
    if (typeMatch && supportsImageGeneration(typeMatch.type)) {
      configsToTry.push(typeMatch);
    }
  }

  // 3. Add fallback(s) from ordered provider list to reach 2 configs
  for (const providerType of IMAGE_GENERATION_PROVIDERS) {
    if (configsToTry.length >= 2) {
      break;
    }

    const config = configs.find(
      (c) =>
        c.type === providerType && !configsToTry.some((c2) => c2.id === c.id),
    );
    if (config) {
      configsToTry.push(config);
    }
  }

  if (configsToTry.length === 0) {
    return err(
      new TypedError.NoImageModel(
        "No provider with image generation support found",
      ),
    );
  }

  // Try each config in order, return first success or last error
  for (let i = 0; i < configsToTry.length; i++) {
    const config = configsToTry[i];
    if (!config) {
      continue;
    }

    const result = await tryGenerateWithConfig({
      config,
      count,
      prompt,
      signal,
      workspaceConfig,
      workspaceServerURL,
    });

    if (result.isOk() || i === configsToTry.length - 1) {
      return result;
    }
  }

  // This should never be reached due to length check above
  return err(
    new TypedError.NoImageModel(
      "No provider with image generation support found",
    ),
  );
}

async function tryGenerateWithConfig({
  config,
  count,
  prompt,
  signal,
  workspaceConfig,
  workspaceServerURL,
}: {
  config: AIGatewayProviderConfig.Type;
  count: number;
  prompt: string;
  signal: AbortSignal;
  workspaceConfig: WorkspaceConfig;
  workspaceServerURL: WorkspaceServerURL;
}) {
  const result = await getAISDKImageModel({
    config,
    workspaceServerURL,
  });

  const [modelAndType, fetchError] = result.toTuple();

  if (fetchError) {
    return err(
      new TypedError.NoImageModel(
        `Failed to fetch image model: ${fetchError.message}`,
        { cause: fetchError },
      ),
    );
  }

  const generateResult = await ResultAsync.fromPromise(
    (async () => {
      if (modelAndType.type === "language") {
        const textResult = await generateText({
          abortSignal: signal,
          model: modelAndType.model,
          prompt,
        });

        return {
          images: textResult.files,
          modelId: modelAndType.model.modelId,
          provider: config,
          usage: textResult.usage,
        };
      }

      const imageResult = await generateImage({
        abortSignal: signal,
        model: modelAndType.model,
        n: count,
        prompt,
      });

      return {
        images: imageResult.images,
        modelId: modelAndType.model.modelId,
        provider: config,
        usage: imageResult.usage,
      };
    })(),
    (generationError) => {
      const error = new TypedError.ImageGeneration(
        `Failed to generate image: ${generationError instanceof Error ? generationError.message : "Unknown error"}`,
        { cause: generationError },
      );
      workspaceConfig.captureException(error);
      return error;
    },
  );

  return generateResult;
}
