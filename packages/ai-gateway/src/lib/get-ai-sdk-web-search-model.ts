import {
  type LanguageModelV3,
  type SharedV3ProviderOptions,
} from "@ai-sdk/provider";
import { type XaiProviderOptions } from "@ai-sdk/xai";
import {
  QUESTS_AUTO_MODEL_PROVIDER_ID,
  type WorkspaceServerURL,
} from "@quests/shared";
import { type ToolSet } from "ai";
import { Result } from "typescript-result";

import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import {
  createAnthropicSDK,
  createOpenAISDK,
  createOpenRouterSDK,
  createXAISDK,
} from "./ai-sdk-for-provider-config";
import { TypedError } from "./errors";

export const TEST_WEB_SEARCH_MODEL_OVERRIDE_KEY =
  "__testWebSearchModelOverride";

export interface AISDKWebSearchModelResult {
  model: LanguageModelV3;
  providerOptions?: SharedV3ProviderOptions;
  tools?: ToolSet;
}

export async function getAISDKWebSearchModel({
  config,
  workspaceServerURL,
}: {
  config: AIGatewayProviderConfig.Type;
  workspaceServerURL: WorkspaceServerURL;
}): Promise<Result<AISDKWebSearchModelResult, TypedError.Type>> {
  const testOverride = (
    config as {
      [TEST_WEB_SEARCH_MODEL_OVERRIDE_KEY]?: AISDKWebSearchModelResult;
    }
  )[TEST_WEB_SEARCH_MODEL_OVERRIDE_KEY];
  if (testOverride) {
    return Result.ok(testOverride);
  }

  switch (config.type) {
    case "anthropic": {
      const sdk = await createAnthropicSDK(config, workspaceServerURL);
      return Result.ok({
        model: sdk("claude-sonnet-4-5-20250929"),
        tools: {
          web_search: sdk.tools.webSearch_20250305({ maxUses: 2 }),
        },
      });
    }
    case "openai": {
      const sdk = await createOpenAISDK(config, workspaceServerURL);
      return Result.ok({
        model: sdk("gpt-5-mini"),
        tools: {
          web_search: sdk.tools.webSearch(),
        },
      });
    }
    case "openrouter":
    case "quests": {
      const sdk = await createOpenRouterSDK(config, workspaceServerURL);
      return Result.ok({
        model: sdk(QUESTS_AUTO_MODEL_PROVIDER_ID),
        providerOptions: {
          openrouter: {
            plugins: [{ engine: "native", id: "web" }],
          },
        },
      });
    }
    case "x-ai": {
      const sdk = await createXAISDK(config, workspaceServerURL);
      return Result.ok({
        model: sdk("grok-4-1-fast-non-reasoning"),
        providerOptions: {
          xai: {
            searchParameters: {
              maxSearchResults: 10,
              mode: "on",
              returnCitations: true,
            },
          } satisfies XaiProviderOptions,
        },
      });
    }
  }

  return Result.error(
    new TypedError.NotFound(
      `Provider ${config.type} does not support web search`,
    ),
  );
}
