import { createAnthropic } from "@ai-sdk/anthropic";
import { createCerebras } from "@ai-sdk/cerebras";
import { createDeepInfra } from "@ai-sdk/deepinfra";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createFireworks } from "@ai-sdk/fireworks";
import { createGateway } from "@ai-sdk/gateway";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createPerplexity } from "@ai-sdk/perplexity";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { createXai } from "@ai-sdk/xai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  ATTRIBUTION_NAME,
  ATTRIBUTION_URL,
  type WorkspaceServerURL,
} from "@quests/shared";
import { createOllama } from "ollama-ai-provider-v2";

import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { internalURL } from "./internal-url";
import { internalAPIKey } from "./key-for-provider";

export function aiSDKForProviderConfig(
  config: AIGatewayProviderConfig.Type,
  workspaceServerURL: WorkspaceServerURL,
) {
  switch (config.type) {
    case "anthropic": {
      return createAnthropic({
        apiKey: internalAPIKey(),
        baseURL: internalURL({ config, workspaceServerURL }),
      });
    }
    case "cerebras": {
      return createCerebras({
        apiKey: internalAPIKey(),
        baseURL: internalURL({ config, workspaceServerURL }),
      });
    }
    case "deepinfra": {
      return createDeepInfra({
        apiKey: internalAPIKey(),
        baseURL: internalURL({ config, workspaceServerURL }),
      });
    }
    case "deepseek": {
      return createDeepSeek({
        apiKey: internalAPIKey(),
        baseURL: internalURL({ config, workspaceServerURL }),
      });
    }
    case "fireworks": {
      return createFireworks({
        apiKey: internalAPIKey(),
        baseURL: internalURL({ config, workspaceServerURL }),
      });
    }
    case "google": {
      return createGoogleGenerativeAI({
        apiKey: internalAPIKey(),
        baseURL: internalURL({ config, workspaceServerURL }),
      });
    }
    case "groq": {
      return createGroq({
        apiKey: internalAPIKey(),
        baseURL: internalURL({ config, workspaceServerURL }),
      });
    }
    case "mistral": {
      return createMistral({
        apiKey: internalAPIKey(),
        baseURL: internalURL({ config, workspaceServerURL }),
      });
    }
    case "ollama": {
      return createOllama({
        baseURL: internalURL({ config, workspaceServerURL }),
        headers: {
          Authorization: `Bearer ${internalAPIKey()}`,
        },
      });
    }
    case "openai": {
      return createOpenAI({
        apiKey: internalAPIKey(),
        baseURL: internalURL({ config, workspaceServerURL }),
      });
    }
    case "openrouter": {
      return createOpenRouter({
        apiKey: internalAPIKey(),
        baseURL: internalURL({ config, workspaceServerURL }),
        extraBody: {
          user: config.cacheIdentifier,
        },
        headers: {
          "HTTP-Referer": ATTRIBUTION_URL,
          "X-Title": ATTRIBUTION_NAME,
        },
      });
    }
    case "perplexity": {
      return createPerplexity({
        apiKey: internalAPIKey(),
        baseURL: internalURL({ config, workspaceServerURL }),
      });
    }
    case "quests": {
      // Main difference is the lack of a cache identifier, which will be set by the server.
      return createOpenRouter({
        apiKey: internalAPIKey(),
        baseURL: internalURL({ config, workspaceServerURL }),
        headers: {
          "HTTP-Referer": ATTRIBUTION_URL,
          "X-Title": ATTRIBUTION_NAME,
        },
      });
    }
    case "together": {
      return createTogetherAI({
        apiKey: internalAPIKey(),
        baseURL: internalURL({ config, workspaceServerURL }),
      });
    }
    case "vercel": {
      return createGateway({
        apiKey: internalAPIKey(),
        baseURL: internalURL({ config, workspaceServerURL }),
        headers: {
          "http-referer": ATTRIBUTION_URL,
          "x-title": ATTRIBUTION_NAME,
        },
      });
    }
    case "x-ai": {
      return createXai({
        apiKey: internalAPIKey(),
        baseURL: internalURL({ config, workspaceServerURL }),
      });
    }
    default: {
      return createOpenAICompatible({
        apiKey: internalAPIKey(),
        baseURL: internalURL({ config, workspaceServerURL }),
        name: config.type,
      });
    }
  }
}
