import {
  type LanguageModelV3,
  type SharedV3ProviderOptions,
} from "@ai-sdk/provider";
import { QUESTS_AUTO_MODEL_ID, type WorkspaceServerURL } from "@quests/shared";
import { type ToolSet } from "ai";
import { Result } from "typescript-result";

import { type AIGatewayModel } from "../schemas/model";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import {
  createAnthropicSDK,
  createGoogleSDK,
  createOpenAISDK,
  createOpenRouterSDK,
  createXAISDK,
} from "./ai-sdk-for-provider-config";
import { TypedError } from "./errors";
import {
  filterWebSearchConfigs,
  type WebSearchProviderType,
} from "./providers/metadata";
import { selectProviderConfigs } from "./select-provider-configs";

const PROVIDER_TYPE_PRIORITY: WebSearchProviderType[] = [
  // Ordered by quality/reliability as of 2026-02-06
  "quests",
  "openrouter",
  "openai",
  "google",
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
  callingModel,
  config,
  workspaceServerURL,
}: {
  callingModel: AIGatewayModel.Type;
  config: AIGatewayProviderConfig.Type & { type: WebSearchProviderType };
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
  const isCallingModelSameProvider =
    callingModel.params.provider === config.type;

  switch (config.type) {
    case "anthropic": {
      const sdk = await createAnthropicSDK(config, workspaceServerURL);
      result = {
        model: isCallingModelSameProvider
          ? sdk(callingModel.providerId)
          : sdk("claude-sonnet-4-5-20250929"),
        tools: {
          web_search: sdk.tools.webSearch_20250305({ maxUses: 2 }),
        },
      };
      break;
    }
    case "google": {
      const sdk = await createGoogleSDK(config, workspaceServerURL);
      result = {
        model: sdk("gemini-3-pro-preview"),
        tools: {
          web_search: sdk.tools.googleSearch({
            mode: "MODE_UNSPECIFIED", // Ensures search always runs
          }),
        },
      };
      break;
    }
    case "openai": {
      const sdk = await createOpenAISDK(config, workspaceServerURL);
      result = {
        model: isCallingModelSameProvider
          ? sdk(callingModel.providerId)
          : sdk("gpt-5-mini"),
        tools: {
          web_search: sdk.tools.webSearch(),
        },
      };
      break;
    }
    case "openrouter":
    case "quests": {
      const sdk = await createOpenRouterSDK(config, workspaceServerURL);
      result = {
        model: isCallingModelSameProvider
          ? sdk(callingModel.providerId)
          : config.type === "openrouter"
            ? sdk("openrouter/auto")
            : sdk(QUESTS_AUTO_MODEL_ID),
        providerOptions: {
          openrouter: {
            // Let OpenRouter decide native vs Exa-powered
            plugins: [{ id: "web" }],
          },
        },
      };
      break;
    }
    case "x-ai": {
      const sdk = await createXAISDK(config, workspaceServerURL);
      result = {
        model: isCallingModelSameProvider
          ? sdk.responses(callingModel.providerId)
          : sdk.responses("grok-4-1-fast-non-reasoning"),
        tools: {
          web_search: sdk.tools.webSearch(),
        },
      };
      break;
    }
    default: {
      const _exhaustiveCheck: never = config.type;
      return Result.error(
        new TypedError.NotFound(
          `Unhandled provider type: ${JSON.stringify(_exhaustiveCheck)}`,
        ),
      );
    }
  }

  return Result.ok({ ...result, config });
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

  const supportedConfigs = filterWebSearchConfigs(configs);

  const configsToTry = selectProviderConfigs({
    configs: supportedConfigs,
    preferredProviderConfig,
    providerTypePriority: PROVIDER_TYPE_PRIORITY,
  });

  if (configsToTry.length === 0) {
    return Result.error(
      new TypedError.NotFound("No provider with web search support found"),
    );
  }

  for (const config of configsToTry) {
    const result = await getAISDKWebSearchModel({
      callingModel,
      config,
      workspaceServerURL,
    });
    if (result.ok) {
      return Result.ok({ ...result.value, config });
    }
  }

  return Result.error(
    new TypedError.NotFound("No provider with web search support found"),
  );
}
