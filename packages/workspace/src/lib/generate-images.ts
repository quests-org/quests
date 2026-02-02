import {
  type AIGatewayProviderConfig,
  fetchAISDKImageModel,
  getAllProviderMetadata,
  getProviderMetadata,
} from "@quests/ai-gateway";
import { type WorkspaceServerURL } from "@quests/shared";
import { generateImage, generateText } from "ai";
import { err, ok } from "neverthrow";

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
  if (preferredConfig && supportsImageGeneration(preferredConfig.type)) {
    return tryGenerateWithConfig({
      config: preferredConfig,
      count,
      prompt,
      signal,
      workspaceServerURL,
    });
  }

  // Fall back to type-based ordering
  const configsByType = new Map(configs.map((c) => [c.type, c]));

  const shouldTryPreferredType =
    !preferredConfig && supportsImageGeneration(preferredProviderConfig.type);

  const orderedProviderTypes = [
    ...(shouldTryPreferredType ? [preferredProviderConfig.type] : []),
    ...IMAGE_GENERATION_PROVIDERS.filter(
      (type) => type !== preferredConfig?.type,
    ),
  ];

  for (const providerType of orderedProviderTypes) {
    const config = configsByType.get(providerType);
    if (!config) {
      continue;
    }

    return tryGenerateWithConfig({
      config,
      count,
      prompt,
      signal,
      workspaceServerURL,
    });
  }

  return err("No provider with image generation support found");
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
  const result = await fetchAISDKImageModel({
    config,
    workspaceServerURL,
  });

  const [modelAndType, error] = result.toTuple();

  if (error) {
    return err(error);
  }

  if (modelAndType.type === "language") {
    const textResult = await generateText({
      abortSignal: signal,
      model: modelAndType.model,
      prompt,
    });

    return ok({
      images: textResult.files,
      modelId: modelAndType.model.modelId,
      provider: config,
      usage: textResult.usage,
    });
  }

  const imageResult = await generateImage({
    abortSignal: signal,
    model: modelAndType.model,
    n: count,
    prompt,
  });

  return ok({
    images: imageResult.images,
    modelId: modelAndType.model.modelId,
    provider: config,
    usage: imageResult.usage,
  });
}
