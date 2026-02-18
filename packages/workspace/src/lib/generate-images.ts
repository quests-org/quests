import {
  type AIGatewayModel,
  type AIGatewayProviderConfig,
  getImageModel,
  type ImageGenerationProviderType,
} from "@quests/ai-gateway";
import { type WorkspaceServerURL } from "@quests/shared";
import { APICallError, generateImage, generateText } from "ai";
import { err, ResultAsync } from "neverthrow";

import { type WorkspaceConfig } from "../types";
import { TypedError } from "./errors";

const SOURCE_IMAGE_LIMITS: Partial<
  Record<ImageGenerationProviderType, number>
> = {
  fireworks: 1,
  together: 1,
  "x-ai": 1,
};

export async function generateImages({
  callingModel,
  configs,
  count,
  prompt,
  signal,
  sourceImages,
  workspaceConfig,
  workspaceServerURL,
}: {
  callingModel: AIGatewayModel.Type;
  configs: AIGatewayProviderConfig.Type[];
  count: number;
  prompt: string;
  signal: AbortSignal;
  sourceImages?: Buffer[];
  workspaceConfig: WorkspaceConfig;
  workspaceServerURL: WorkspaceServerURL;
}) {
  const modelResult = await getImageModel({
    callingModel,
    configs,
    workspaceServerURL,
  });

  const [resolved, modelError] = modelResult.toTuple();

  if (modelError) {
    return err(modelError);
  }

  const { config, model, type } = resolved;

  if (sourceImages && sourceImages.length > 0) {
    const maxSourceImages = SOURCE_IMAGE_LIMITS[config.type];
    if (
      maxSourceImages !== undefined &&
      sourceImages.length > maxSourceImages
    ) {
      return err(
        new TypedError.ProviderLimitation(
          `The ${config.displayName ?? config.type} provider supports at most ${maxSourceImages} source image${maxSourceImages === 1 ? "" : "s"} per request, but ${sourceImages.length} were provided.`,
        ),
      );
    }
  }

  const generateResult = await ResultAsync.fromPromise(
    (async () => {
      if (type === "language") {
        const textResult =
          sourceImages && sourceImages.length > 0
            ? await generateText({
                abortSignal: signal,
                messages: [
                  {
                    content: [
                      ...sourceImages.map((buf) => ({
                        image: buf,
                        type: "image" as const,
                      })),
                      { text: prompt, type: "text" as const },
                    ],
                    role: "user" as const,
                  },
                ],
                model,
              })
            : await generateText({
                abortSignal: signal,
                model,
                prompt,
              });

        return {
          config,
          images: textResult.files,
          modelId: model.modelId,
          usage: textResult.usage,
        };
      }

      const imageResult = await generateImage({
        abortSignal: signal,
        model,
        n: count,
        prompt:
          sourceImages && sourceImages.length > 0
            ? { images: sourceImages, text: prompt }
            : prompt,
      });

      return {
        config,
        images: imageResult.images,
        modelId: model.modelId,
        usage: imageResult.usage,
      };
    })(),
    (generationError) => {
      const message = `Failed to generate image: ${generationError instanceof Error ? generationError.message : "Unknown error"}`;
      const responseBody = APICallError.isInstance(generationError)
        ? generationError.responseBody
        : undefined;
      const error = new TypedError.APICall(message, {
        cause: generationError,
        responseBody,
      });
      workspaceConfig.captureException(error);
      return error;
    },
  );

  return generateResult;
}
