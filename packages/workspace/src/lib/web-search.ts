import { type LanguageModelV3Source } from "@ai-sdk/provider";
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

      // Edge case: Vercel AI SDK with Perplexity search returns results as
      // tool call outputs rather than inline text, unlike every other search
      // grounding provider. When this happens, textResult.text is typically
      // empty and we need to synthesize text + sources from the tool results.
      let { sources, text } = textResult;
      if (
        textResult.toolResults.some(
          (result) => result.toolName === "perplexity_search",
        )
      ) {
        const perplexityResults = textResult.toolResults
          .filter((result) => result.toolName === "perplexity_search")
          .flatMap((result) => {
            const output = result.output as
              | undefined
              | {
                  results: {
                    date?: string;
                    snippet: string;
                    title: string;
                    url: string;
                  }[];
                };
            return output?.results ?? [];
          });

        text = perplexityResults.map((r) => r.snippet).join("\n\n");

        sources = [
          ...sources,
          ...perplexityResults.map(
            (r, i) =>
              ({
                id: `perplexity-${i}`,
                sourceType: "url",
                title: r.title,
                type: "source",
                url: r.url,
              }) satisfies LanguageModelV3Source,
          ),
        ];
      }

      return {
        modelId: model.modelId,
        provider: config,
        sources,
        text,
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
