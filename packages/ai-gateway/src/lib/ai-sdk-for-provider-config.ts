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
      const { createAnthropic } = await import("@ai-sdk/anthropic");
      return createAnthropic({ apiKey, baseURL });
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
      const { createFireworks } = await import("@ai-sdk/fireworks");
      return createFireworks({ apiKey, baseURL });
    }
    case "@ai-sdk/gateway": {
      const { createGateway } = await import("@ai-sdk/gateway");
      return createGateway({
        apiKey,
        baseURL,
        headers: {
          "http-referer": ATTRIBUTION_URL,
          "x-title": ATTRIBUTION_NAME,
        },
      });
    }
    case "@ai-sdk/google": {
      const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
      return createGoogleGenerativeAI({ apiKey, baseURL });
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
      const { createOpenAI } = await import("@ai-sdk/openai");
      return createOpenAI({ apiKey, baseURL });
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
      const { createXai } = await import("@ai-sdk/xai");
      return createXai({ apiKey, baseURL });
    }
    case "@openrouter/ai-sdk-provider": {
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
    case "ollama-ai-provider-v2": {
      const { createOllama } = await import("ollama-ai-provider-v2");
      return createOllama({
        baseURL,
        headers: { Authorization: `Bearer ${apiKey}` },
      });
    }
  }
}
