import { type WorkspaceServerURL } from "@quests/shared";
import { generateImage } from "ai";
import { Result } from "typescript-result";

import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import {
  createGoogleSDK,
  createOpenAISDK,
  createOpenRouterSDK,
} from "./ai-sdk-for-provider-config";

export async function generateImageWithProvider({
  configs,
  prompt,
  signal,
  workspaceServerURL,
}: {
  configs: AIGatewayProviderConfig.Type[];
  prompt: string;
  signal: AbortSignal;
  workspaceServerURL: WorkspaceServerURL;
}): Promise<Result<{ base64: string; providerType: string }, string>> {
  for (const config of configs) {
    let imageModel;
    switch (config.type) {
      case "google": {
        const sdk = await createGoogleSDK(config, workspaceServerURL);
        // cspell:ignore imagen
        imageModel = sdk.image("imagen-4.0-fast-generate-001");
        break;
      }
      case "openai": {
        const sdk = await createOpenAISDK(config, workspaceServerURL);
        imageModel = sdk.image("gpt-image-1.5");
        break;
      }
      case "openrouter":
      case "quests": {
        const sdk = await createOpenRouterSDK(config, workspaceServerURL);
        imageModel = sdk.imageModel("google/gemini-2.5-flash-image");
        break;
      }
      default: {
        continue;
      }
    }

    const result = await generateImage({
      abortSignal: signal,
      aspectRatio: "16:9",
      model: imageModel,
      prompt,
    });

    return Result.ok({
      base64: result.image.base64,
      providerType: config.type,
    });
  }

  return Result.error("No provider with image generation support found");
}
