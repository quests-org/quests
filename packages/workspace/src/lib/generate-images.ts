import {
  type AIGatewayModel,
  type AIGatewayProviderConfig,
  getImageModel,
} from "@quests/ai-gateway";
import { type WorkspaceServerURL } from "@quests/shared";
import { APICallError, generateImage, generateText } from "ai";
import { err, ResultAsync } from "neverthrow";

import { type WorkspaceConfig } from "../types";
import { TypedError } from "./errors";

export async function generateImages({
  callingModel,
  configs,
  count,
  prompt,
  signal,
  workspaceConfig,
  workspaceServerURL,
}: {
  callingModel: AIGatewayModel.Type;
  configs: AIGatewayProviderConfig.Type[];
  count: number;
  prompt: string;
  signal: AbortSignal;
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
