import {
  type AIGatewayProviderConfig,
  getImageModel,
} from "@quests/ai-gateway";
import { type WorkspaceServerURL } from "@quests/shared";
import { generateImage, generateText } from "ai";
import { err, ResultAsync } from "neverthrow";

import { type WorkspaceConfig } from "../types";
import { TypedError } from "./errors";

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
  const modelResult = await getImageModel({
    configs,
    preferredProviderConfig,
    workspaceServerURL,
  });

  const [resolved, modelError] = modelResult.toTuple();

  if (modelError) {
    return err(modelError);
  }

  const { config, model, type } = resolved;

  const generateResult = await ResultAsync.fromPromise(
    (async () => {
      if (type === "language") {
        const textResult = await generateText({
          abortSignal: signal,
          model,
          prompt,
        });

        return {
          images: textResult.files,
          modelId: model.modelId,
          provider: config,
          usage: textResult.usage,
        };
      }

      const imageResult = await generateImage({
        abortSignal: signal,
        model,
        n: count,
        prompt,
      });

      return {
        images: imageResult.images,
        modelId: model.modelId,
        provider: config,
        usage: imageResult.usage,
      };
    })(),
    (generationError) => {
      const error = new TypedError.Unknown(
        `Failed to generate image: ${generationError instanceof Error ? generationError.message : "Unknown error"}`,
        { cause: generationError },
      );
      workspaceConfig.captureException(error);
      return error;
    },
  );

  return generateResult;
}
