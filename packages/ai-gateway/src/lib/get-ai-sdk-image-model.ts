import { type ImageModelV3, type LanguageModelV3 } from "@ai-sdk/provider";
import {
  QUESTS_AUTO_IMAGE_MODEL_ID,
  type WorkspaceServerURL,
} from "@quests/shared";
import { Result } from "typescript-result";

import { type AIGatewayModel } from "../schemas/model";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import {
  createDeepInfraSDK,
  createFireworksSDK,
  createGoogleSDK,
  createOpenAISDK,
  createOpenRouterSDK,
  createTogetherAISDK,
  createVercelSDK,
  createXAISDK,
} from "./ai-sdk-for-provider-config";
import { TypedError } from "./errors";
import {
  filterImageGenerationConfigs,
  type ImageGenerationProviderType,
} from "./providers/metadata";
import { selectProviderConfigs } from "./select-provider-configs";

const PROVIDER_TYPE_PRIORITY: ImageGenerationProviderType[] = [
  // Ordered by quality as of 2026-01-30
  "quests",
  "openrouter",
  "google",
  "openai",
  "x-ai",
  "vercel",
  "fireworks",
  "together",
  "deepinfra",
];

export const TEST_IMAGE_MODEL_OVERRIDE_KEY = "__testImageModelOverride";

export type AISDKImageModelResult =
  | { model: ImageModelV3; type: "image" }
  | { model: LanguageModelV3; type: "language" };

export async function getImageModel({
  callingModel,
  configs,
  workspaceServerURL,
}: {
  callingModel: AIGatewayModel.Type;
  configs: AIGatewayProviderConfig.Type[];
  workspaceServerURL: WorkspaceServerURL;
}) {
  const preferredProviderConfig = configs.find(
    (c) => c.id === callingModel.params.providerConfigId,
  );

  if (!preferredProviderConfig) {
    return Result.error(
      new TypedError.NotFound("No AI provider found for current model"),
    );
  }

  const supportedConfigs = filterImageGenerationConfigs(configs);

  const configsToTry = selectProviderConfigs({
    configs: supportedConfigs,
    preferredProviderConfig,
    providerTypePriority: PROVIDER_TYPE_PRIORITY,
  });

  if (configsToTry.length === 0) {
    return Result.error(
      new TypedError.NotFound(
        "No provider with image generation support found",
      ),
    );
  }

  for (const config of configsToTry) {
    const result = await getAISDKImageModel({ config, workspaceServerURL });
    if (result.ok) {
      return Result.ok({ ...result.value, config });
    }
  }

  return Result.error(
    new TypedError.NotFound("No provider with image generation support found"),
  );
}

async function getAISDKImageModel({
  config,
  workspaceServerURL,
}: {
  config: AIGatewayProviderConfig.Type & { type: ImageGenerationProviderType };
  workspaceServerURL: WorkspaceServerURL;
}) {
  const testOverride = (
    config as { [TEST_IMAGE_MODEL_OVERRIDE_KEY]?: AISDKImageModelResult }
  )[TEST_IMAGE_MODEL_OVERRIDE_KEY];
  if (testOverride) {
    return Result.ok(testOverride);
  }

  switch (config.type) {
    case "deepinfra": {
      const sdk = await createDeepInfraSDK(config, workspaceServerURL);
      const model = sdk.image("black-forest-labs/FLUX-1-schnell");
      return Result.ok({ model, type: "image" as const });
    }
    case "fireworks": {
      const sdk = await createFireworksSDK(config, workspaceServerURL);
      const model = sdk.imageModel(
        // cspell:ignore schnell
        "accounts/fireworks/models/flux-1-schnell-fp8",
      );
      return Result.ok({ model, type: "image" as const });
    }
    case "google": {
      const sdk = await createGoogleSDK(config, workspaceServerURL);
      const model = sdk.imageModel("gemini-2.5-flash-image");
      return Result.ok({ model, type: "image" as const });
    }
    case "openai": {
      const sdk = await createOpenAISDK(config, workspaceServerURL);
      const model = sdk.image("gpt-image-1-mini");
      return Result.ok({ model, type: "image" as const });
    }
    case "openrouter": {
      const sdk = await createOpenRouterSDK(config, workspaceServerURL);
      const model = sdk.imageModel("google/gemini-2.5-flash-image");
      return Result.ok({ model, type: "image" as const });
    }
    case "quests": {
      const sdk = await createOpenRouterSDK(config, workspaceServerURL);
      const model = sdk.imageModel(QUESTS_AUTO_IMAGE_MODEL_ID);
      return Result.ok({ model, type: "image" as const });
    }
    case "together": {
      const sdk = await createTogetherAISDK(config, workspaceServerURL);
      const model = sdk.image("black-forest-labs/FLUX.1-schnell");
      return Result.ok({ model, type: "image" as const });
    }
    case "vercel": {
      const sdk = createVercelSDK(config, workspaceServerURL);
      const model = sdk("google/gemini-2.5-flash-image");
      return Result.ok({ model, type: "language" as const });
    }
    case "x-ai": {
      const sdk = await createXAISDK(config, workspaceServerURL);
      const model = sdk.imageModel("grok-imagine-image");
      return Result.ok({ model, type: "image" as const });
    }
    default: {
      const _exhaustiveCheck: never = config.type;
      return Result.error(
        new TypedError.NotFound(
          `Unhandled provider type: ${JSON.stringify(_exhaustiveCheck)}`,
        ),
      );
    }
  }
}
