// Static import because @ai-sdk/gateway is already statically imported by the ai package,
// so dynamic import won't code-split it into a separate chunk
import { createGateway } from "@ai-sdk/gateway";
import {
  ATTRIBUTION_NAME,
  ATTRIBUTION_URL,
  type WorkspaceServerURL,
} from "@quests/shared";

import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { getPackageForProviderType } from "./bundled-providers";
import { internalURL } from "./internal-url";
import { internalAPIKey } from "./key-for-provider";

export async function aiSDKForProviderConfig(
  config: AIGatewayProviderConfig.Type,
  workspaceServerURL: WorkspaceServerURL,
) {
  const baseURL = internalURL({ config, workspaceServerURL });
  const apiKey = internalAPIKey();
  const packageName = getPackageForProviderType(config.type);

  switch (packageName) {
    case "@ai-sdk/anthropic": {
      return createAnthropicSDK(config, workspaceServerURL);
    }
    case "@ai-sdk/cerebras": {
      const { createCerebras } = await import("@ai-sdk/cerebras");
      return createCerebras({ apiKey, baseURL });
    }
    case "@ai-sdk/deepinfra": {
      const { createDeepInfra } = await import("@ai-sdk/deepinfra");
      return createDeepInfra({ apiKey, baseURL });
    }
    case "@ai-sdk/deepseek": {
      const { createDeepSeek } = await import("@ai-sdk/deepseek");
      return createDeepSeek({ apiKey, baseURL });
    }
    case "@ai-sdk/fireworks": {
      return createFireworksSDK(config, workspaceServerURL);
    }
    case "@ai-sdk/gateway": {
      return createVercelSDK(config, workspaceServerURL);
    }
    case "@ai-sdk/google": {
      return createGoogleSDK(config, workspaceServerURL);
    }
    case "@ai-sdk/groq": {
      const { createGroq } = await import("@ai-sdk/groq");
      return createGroq({ apiKey, baseURL });
    }
    case "@ai-sdk/mistral": {
      const { createMistral } = await import("@ai-sdk/mistral");
      return createMistral({ apiKey, baseURL });
    }
    case "@ai-sdk/openai": {
      return createOpenAISDK(config, workspaceServerURL);
    }
    case "@ai-sdk/openai-compatible": {
      const { createOpenAICompatible } = await import(
        "@ai-sdk/openai-compatible"
      );
      return createOpenAICompatible({
        apiKey,
        baseURL,
        name: config.type,
      });
    }
    case "@ai-sdk/perplexity": {
      const { createPerplexity } = await import("@ai-sdk/perplexity");
      return createPerplexity({ apiKey, baseURL });
    }
    case "@ai-sdk/togetherai": {
      const { createTogetherAI } = await import("@ai-sdk/togetherai");
      return createTogetherAI({ apiKey, baseURL });
    }
    case "@ai-sdk/xai": {
      return createXAISDK(config, workspaceServerURL);
    }
    case "@openrouter/ai-sdk-provider": {
      return createOpenRouterSDK(config, workspaceServerURL);
    }
    case "ai-sdk-ollama": {
      const { createOllama } = await import("ai-sdk-ollama");
      return createOllama({
        baseURL,
        headers: { Authorization: `Bearer ${apiKey}` },
      });
    }
  }
}

export async function createAnthropicSDK(
  config: AIGatewayProviderConfig.Type,
  workspaceServerURL: WorkspaceServerURL,
) {
  const baseURL = internalURL({ config, workspaceServerURL });
  const apiKey = internalAPIKey();
  const { createAnthropic } = await import("@ai-sdk/anthropic");
  return createAnthropic({ apiKey, baseURL });
}

export async function createFireworksSDK(
  config: AIGatewayProviderConfig.Type,
  workspaceServerURL: WorkspaceServerURL,
) {
  const baseURL = internalURL({ config, workspaceServerURL });
  const apiKey = internalAPIKey();
  const { createFireworks } = await import("@ai-sdk/fireworks");
  return createFireworks({ apiKey, baseURL });
}

export async function createGoogleSDK(
  config: AIGatewayProviderConfig.Type,
  workspaceServerURL: WorkspaceServerURL,
) {
  const baseURL = internalURL({ config, workspaceServerURL });
  const apiKey = internalAPIKey();
  const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
  return createGoogleGenerativeAI({ apiKey, baseURL });
}

export async function createOpenAISDK(
  config: AIGatewayProviderConfig.Type,
  workspaceServerURL: WorkspaceServerURL,
) {
  const baseURL = internalURL({ config, workspaceServerURL });
  const apiKey = internalAPIKey();
  const { createOpenAI } = await import("@ai-sdk/openai");
  return createOpenAI({ apiKey, baseURL });
}

export async function createOpenRouterSDK(
  config: AIGatewayProviderConfig.Type,
  workspaceServerURL: WorkspaceServerURL,
) {
  const baseURL = internalURL({ config, workspaceServerURL });
  const apiKey = internalAPIKey();
  const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
  const extraConfig =
    config.type === "openrouter"
      ? { extraBody: { user: config.cacheIdentifier } }
      : {};
  return createOpenRouter({
    apiKey,
    baseURL,
    ...extraConfig,
    headers: {
      "HTTP-Referer": ATTRIBUTION_URL,
      "X-Title": ATTRIBUTION_NAME,
    },
  });
}

export function createVercelSDK(
  config: AIGatewayProviderConfig.Type,
  workspaceServerURL: WorkspaceServerURL,
) {
  const baseURL = internalURL({ config, workspaceServerURL });
  const apiKey = internalAPIKey();
  return createGateway({
    apiKey,
    baseURL,
    headers: {
      "http-referer": ATTRIBUTION_URL,
      "x-title": ATTRIBUTION_NAME,
    },
  });
}

export async function createXAISDK(
  config: AIGatewayProviderConfig.Type,
  workspaceServerURL: WorkspaceServerURL,
) {
  const baseURL = internalURL({ config, workspaceServerURL });
  const apiKey = internalAPIKey();
  const { createXai } = await import("@ai-sdk/xai");
  return createXai({ apiKey, baseURL });
}
