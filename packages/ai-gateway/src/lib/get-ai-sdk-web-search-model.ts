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

import { type AIGatewayModel } from "../schemas/model";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import {
  createAnthropicSDK,
  createOpenAISDK,
  createOpenRouterSDK,
  createXAISDK,
} from "./ai-sdk-for-provider-config";
import { TypedError } from "./errors";
import { type WebSearchProviderType } from "./providers/metadata";
import { selectProviderConfigs } from "./select-provider-configs";

const PROVIDER_TYPE_PRIORITY: WebSearchProviderType[] = [
  // Ordered by quality/reliability as of 2026-02-06
  "quests",
  "openrouter",
  "openai",
  "anthropic",
  "x-ai",
];

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
}) {
  const testOverride = (
    config as {
      [TEST_WEB_SEARCH_MODEL_OVERRIDE_KEY]?: AISDKWebSearchModelResult;
    }
  )[TEST_WEB_SEARCH_MODEL_OVERRIDE_KEY];
  if (testOverride) {
    return Result.ok(testOverride);
  }

  let result: AISDKWebSearchModelResult | undefined;

  switch (config.type) {
    case "anthropic": {
      const sdk = await createAnthropicSDK(config, workspaceServerURL);
      result = {
        model: sdk("claude-sonnet-4-5-20250929"),
        tools: {
          web_search: sdk.tools.webSearch_20250305({ maxUses: 2 }),
        },
      };
      break;
    }
    case "openai": {
      const sdk = await createOpenAISDK(config, workspaceServerURL);
      result = {
        model: sdk("gpt-5-mini"),
        tools: {
          web_search: sdk.tools.webSearch(),
        },
      };
      break;
    }
    case "openrouter": {
      const sdk = await createOpenRouterSDK(config, workspaceServerURL);
      result = {
        model: sdk("google/gemini-2.5-flash"),
        providerOptions: {
          openrouter: {
            plugins: [{ engine: "native", id: "web" }],
          },
        },
      };
      break;
    }
    case "quests": {
      const sdk = await createOpenRouterSDK(config, workspaceServerURL);
      result = {
        model: sdk(QUESTS_AUTO_MODEL_PROVIDER_ID),
        providerOptions: {
          openrouter: {
            plugins: [{ engine: "auto", id: "web" }],
          },
        },
      };
      break;
    }
    case "x-ai": {
      const sdk = await createXAISDK(config, workspaceServerURL);
      result = {
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
      };
      break;
    }
  }

  if (result) {
    return Result.ok({ ...result, config });
  }

  return Result.error(
    new TypedError.NotFound(
      `Provider ${config.type} does not support web search`,
    ),
  );
}

export async function getWebSearchModel({
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

  const configsToTry = selectProviderConfigs({
    configs,
    preferredProviderConfig,
    providerTypePriority: PROVIDER_TYPE_PRIORITY,
  });

  if (configsToTry.length === 0) {
    return Result.error(
      new TypedError.NotFound("No provider with web search support found"),
    );
  }

  for (const config of configsToTry) {
    const result = await getAISDKWebSearchModel({ config, workspaceServerURL });
    if (result.ok) {
      return Result.ok({ ...result.value, config });
    }
  }

  return Result.error(
    new TypedError.NotFound("No provider with web search support found"),
  );
}
