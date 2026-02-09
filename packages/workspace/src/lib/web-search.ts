import {
  type AIGatewayProviderConfig,
  getAISDKWebSearchModel,
  getAllProviderMetadata,
  getProviderMetadata,
} from "@quests/ai-gateway";
import { type WorkspaceServerURL } from "@quests/shared";
import { generateText } from "ai";
import { err, ResultAsync } from "neverthrow";

import { type WorkspaceConfig } from "../types";
import { TypedError } from "./errors";

function supportsWebSearch(type: AIGatewayProviderConfig.Type["type"]) {
  const metadata = getProviderMetadata(type);
  return metadata.tags.includes("webSearch");
}

const WEB_SEARCH_PROVIDERS = getAllProviderMetadata()
  .filter((metadata) => metadata.tags.includes("webSearch"))
  .map((metadata) => metadata.type)
  .sort((a, b) => {
    const order = [
      // Ordered by quality/reliability as of 2026-02-06
      "quests",
      "openrouter",
      "openai",
      "anthropic",
      "x-ai",
    ];
    return order.indexOf(a) - order.indexOf(b);
  });

export async function webSearch({
  configs,
  preferredProviderConfig,
  prompt,
  signal,
  workspaceConfig,
  workspaceServerURL,
}: {
  configs: AIGatewayProviderConfig.Type[];
  preferredProviderConfig: AIGatewayProviderConfig.Type;
  prompt: string;
  signal: AbortSignal;
  workspaceConfig: WorkspaceConfig;
  workspaceServerURL: WorkspaceServerURL;
}) {
  // Build ordered list of up to 2 configs to try
  const configsToTry: AIGatewayProviderConfig.Type[] = [];

  // 1. Try exact ID match first
  const exactMatch = configs.find(
    (c) => c.id === preferredProviderConfig.id && supportsWebSearch(c.type),
  );
  if (exactMatch) {
    configsToTry.push(exactMatch);
  }

  // 2. Try type match if no exact match
  if (!exactMatch) {
    const configsByType = new Map(configs.map((c) => [c.type, c]));
    const typeMatch = configsByType.get(preferredProviderConfig.type);
    if (typeMatch && supportsWebSearch(typeMatch.type)) {
      configsToTry.push(typeMatch);
    }
  }

  // 3. Add fallback(s) from ordered provider list to reach 2 configs
  for (const providerType of WEB_SEARCH_PROVIDERS) {
    if (configsToTry.length >= 2) {
      break;
    }

    const config = configs.find(
      (c) =>
        c.type === providerType && !configsToTry.some((c2) => c2.id === c.id),
    );
    if (config) {
      configsToTry.push(config);
    }
  }

  if (configsToTry.length === 0) {
    return err(
      new TypedError.NoWebSearchModel(
        "No provider with web search support found",
      ),
    );
  }

  // Try each config in order, return first success or last error
  for (let i = 0; i < configsToTry.length; i++) {
    const config = configsToTry[i];
    if (!config) {
      continue;
    }

    const result = await tryWebSearchWithConfig({
      config,
      prompt,
      signal,
      workspaceConfig,
      workspaceServerURL,
    });

    if (result.isOk() || i === configsToTry.length - 1) {
      return result;
    }
  }

  // This should never be reached due to length check above
  return err(
    new TypedError.NoWebSearchModel(
      "No provider with web search support found",
    ),
  );
}

async function tryWebSearchWithConfig({
  config,
  prompt,
  signal,
  workspaceConfig,
  workspaceServerURL,
}: {
  config: AIGatewayProviderConfig.Type;
  prompt: string;
  signal: AbortSignal;
  workspaceConfig: WorkspaceConfig;
  workspaceServerURL: WorkspaceServerURL;
}) {
  const result = await getAISDKWebSearchModel({
    config,
    workspaceServerURL,
  });

  const [modelResult, fetchError] = result.toTuple();

  if (fetchError) {
    return err(
      new TypedError.NoWebSearchModel(
        `Failed to fetch web search model: ${fetchError.message}`,
        { cause: fetchError },
      ),
    );
  }

  const generateResult = await ResultAsync.fromPromise(
    (async () => {
      const textResult = await generateText({
        abortSignal: signal,
        model: modelResult.model,
        prompt,
        providerOptions: modelResult.providerOptions,
        tools: modelResult.tools,
      });

      return {
        modelId: modelResult.model.modelId,
        provider: config,
        sources: textResult.sources,
        text: textResult.text,
        usage: textResult.usage,
      };
    })(),
    (generationError) => {
      const error = new TypedError.NoWebSearchModel(
        `Failed to perform web search: ${generationError instanceof Error ? generationError.message : "Unknown error"}`,
        { cause: generationError },
      );
      workspaceConfig.captureException(error);
      return error;
    },
  );

  return generateResult;
}
