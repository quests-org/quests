import {
  type AIGatewayModel,
  type AIGatewayProviderConfig,
  getWebSearchModel,
} from "@quests/ai-gateway";
import { type WorkspaceServerURL } from "@quests/shared";
import { APICallError, generateText } from "ai";
import { err, ResultAsync } from "neverthrow";

import { type WorkspaceConfig } from "../types";
import { TypedError } from "./errors";

export async function webSearch({
  callingModel,
  configs,
  prompt,
  signal,
  workspaceConfig,
  workspaceServerURL,
}: {
  callingModel: AIGatewayModel.Type;
  configs: AIGatewayProviderConfig.Type[];
  prompt: string;
  signal: AbortSignal;
  workspaceConfig: WorkspaceConfig;
  workspaceServerURL: WorkspaceServerURL;
}) {
  const modelResult = await getWebSearchModel({
    callingModel,
    configs,
    workspaceServerURL,
  });

  const [resolved, modelError] = modelResult.toTuple();

  if (modelError) {
    return err(modelError);
  }

  const { config, model, providerOptions, tools } = resolved;

  const generateResult = await ResultAsync.fromPromise(
    (async () => {
      const textResult = await generateText({
        abortSignal: signal,
        model,
        prompt,
        providerOptions,
        tools,
      });

      return {
        modelId: model.modelId,
        provider: config,
        sources: textResult.sources,
        text: textResult.text,
        usage: textResult.usage,
      };
    })(),
    (generationError) => {
      const message = `Failed to perform web search: ${generationError instanceof Error ? generationError.message : "Unknown error"}`;
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
