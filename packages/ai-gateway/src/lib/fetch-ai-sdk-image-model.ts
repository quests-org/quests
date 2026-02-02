import { type ImageModelV3, type LanguageModelV3 } from "@ai-sdk/provider";
import {
  QUESTS_AUTO_IMAGE_MODEL_ID,
  type WorkspaceServerURL,
} from "@quests/shared";
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
import { TypedError } from "./errors";

export const TEST_IMAGE_MODEL_OVERRIDE_KEY = "__testImageModelOverride";

type ImageGenerationModel =
  | { model: ImageModelV3; type: "image" }
  | { model: LanguageModelV3; type: "language" };

export async function fetchAISDKImageModel({
  config,
  workspaceServerURL,
}: {
  config: AIGatewayProviderConfig.Type;
  workspaceServerURL: WorkspaceServerURL;
}): Promise<Result<ImageGenerationModel, TypedError.Type>> {
  // Test override: check early to avoid fetching models over network
  const testOverride = (
    config as { [TEST_IMAGE_MODEL_OVERRIDE_KEY]?: ImageGenerationModel }
  )[TEST_IMAGE_MODEL_OVERRIDE_KEY];
  if (testOverride) {
    return Result.ok(testOverride);
  }

  // Providers that use generateText (language models)
  switch (config.type) {
    case "google": {
      const sdk = await createGoogleSDK(config, workspaceServerURL);
      const model = sdk("gemini-2.5-flash-image");
      return Result.ok({ model, type: "language" });
    }
    case "vercel": {
      const sdk = createVercelSDK(config, workspaceServerURL);
      const model = sdk("google/gemini-2.5-flash-image");
      return Result.ok({ model, type: "language" });
    }
  }

  // Providers that use generateImage (image models)
  switch (config.type) {
    case "fireworks": {
      const sdk = await createFireworksSDK(config, workspaceServerURL);
      const model = sdk.imageModel(
        // cspell:ignore schnell
        "accounts/fireworks/models/flux-1-schnell-fp8",
      );
      return Result.ok({ model, type: "image" });
    }
    case "openai": {
      const sdk = await createOpenAISDK(config, workspaceServerURL);
      const model = sdk.image("gpt-image-1-mini");
      return Result.ok({ model, type: "image" });
    }
    case "openrouter": {
      const sdk = await createOpenRouterSDK(config, workspaceServerURL);
      const model = sdk.imageModel("google/gemini-2.5-flash-image");
      return Result.ok({ model, type: "image" });
    }
    case "quests": {
      const sdk = await createOpenRouterSDK(config, workspaceServerURL);
      const model = sdk.imageModel(QUESTS_AUTO_IMAGE_MODEL_ID);
      return Result.ok({ model, type: "image" });
    }
    case "x-ai": {
      const sdk = await createXAISDK(config, workspaceServerURL);
      const model = sdk.imageModel("grok-imagine-image");
      return Result.ok({ model, type: "image" });
    }
  }

  return Result.error(
    new TypedError.NotFound(
      `Provider ${config.type} does not support image generation`,
    ),
  );
}
