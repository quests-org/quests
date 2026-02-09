import ms from "ms";
import { ok } from "neverthrow";
import { dedent } from "radashi";
import { z } from "zod";

import { executeError } from "../lib/execute-error";
import { webSearch } from "../lib/web-search";
import { getWorkspaceServerURL } from "../logic/server/url";
import {
  BaseInputSchema,
  ProviderOutputSchema,
  TOOL_EXPLANATION_PARAM_NAME,
  UsageOutputSchema,
} from "./base";
import { createTool } from "./create-tool";

const INPUT_PARAMS = {
  query: "query",
} as const;

export const WebSearch = createTool({
  description: dedent`
    Search the web for real-time, up-to-date information.

    Good for:
    - Current events, recent news, latest developments
    - Verifying facts or getting up-to-date data
    - Looking up documentation, APIs, or technical references
    - Finding information beyond your knowledge cutoff
    - Any question where current, accurate information would improve your response
  `,
  execute: async ({ appConfig, input, model, signal }) => {
    const providerConfigs = appConfig.workspaceConfig.getAIProviderConfigs();
    const preferredProviderConfig = providerConfigs.find(
      (c) => c.id === model.params.providerConfigId,
    );

    if (!preferredProviderConfig) {
      return executeError("No AI provider found for current model.");
    }

    const result = await webSearch({
      configs: providerConfigs,
      preferredProviderConfig,
      prompt: input.query,
      signal,
      workspaceConfig: appConfig.workspaceConfig,
      workspaceServerURL: getWorkspaceServerURL(),
    });

    if (result.isErr()) {
      const searchError = result.error;

      switch (searchError.type) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        case "workspace-no-web-search-model-error": {
          return ok({
            errorMessage:
              "No AI provider with web search capability is available.",
            errorType: "no-web-search-model" as const,
            state: "failure" as const,
          });
        }
        default: {
          return executeError(searchError.message);
        }
      }
    }

    const { modelId, provider, sources, text, usage } = result.value;

    return ok({
      modelId,
      provider: {
        displayName: provider.displayName,
        id: provider.id,
        type: provider.type,
      },
      sources: sources
        .filter(
          (s): s is Extract<typeof s, { sourceType: "url" }> =>
            s.sourceType === "url",
        )
        .map((s) => ({
          title: s.title,
          url: s.url,
        })),
      state: "success" as const,
      text,
      usage: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
      },
    });
  },
  inputSchema: BaseInputSchema.extend({
    [INPUT_PARAMS.query]: z.string().meta({
      description: `The search query describing what information to find. Generate this after ${TOOL_EXPLANATION_PARAM_NAME}.`,
    }),
  }),
  name: "web_search",
  outputSchema: z.discriminatedUnion("state", [
    z.object({
      modelId: z.string(),
      provider: ProviderOutputSchema,
      sources: z.array(
        z.object({
          title: z.string().optional(),
          url: z.string(),
        }),
      ),
      state: z.literal("success"),
      text: z.string(),
      usage: UsageOutputSchema,
    }),
    z.object({
      errorMessage: z.string(),
      errorType: z.enum(["no-web-search-model"]),
      state: z.literal("failure"),
    }),
  ]),
  readOnly: true,
  timeoutMs: ms("2 minutes"),
  toModelOutput: ({ output }) => {
    if (output.state === "failure") {
      return {
        type: "text",
        value: output.errorMessage,
      };
    }

    const sourcesText =
      output.sources.length > 0
        ? `\n\nSources:\n${output.sources.map((s) => `- ${s.title ? `[${s.title}](${s.url})` : s.url}`).join("\n")}`
        : "";

    return {
      type: "text",
      value: `${output.text}${sourcesText}`,
    };
  },
});
