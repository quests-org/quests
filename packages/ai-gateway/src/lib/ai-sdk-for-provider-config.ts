import { createAnthropic } from "@ai-sdk/anthropic";
import { createGateway } from "@ai-sdk/gateway";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  ATTRIBUTION_NAME,
  ATTRIBUTION_URL,
  type WorkspaceServerURL,
} from "@quests/shared";
import { createOllama } from "ollama-ai-provider-v2";

import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { apiBaseURL } from "./api-base-url";
import { internalAPIKey } from "./key-for-provider";

export function aiSDKForProviderConfig(
  config: AIGatewayProviderConfig.Type,
  workspaceServerURL: WorkspaceServerURL,
) {
  switch (config.type) {
    case "anthropic": {
      return createAnthropic({
        apiKey: internalAPIKey(),
        baseURL: apiBaseURL({ type: config.type, workspaceServerURL }),
      });
    }
    case "google": {
      return createGoogleGenerativeAI({
        apiKey: internalAPIKey(),
        baseURL: apiBaseURL({ type: config.type, workspaceServerURL }),
      });
    }
    case "ollama": {
      return createOllama({
        baseURL: apiBaseURL({ type: config.type, workspaceServerURL }),
        headers: {
          Authorization: `Bearer ${internalAPIKey()}`,
        },
      });
    }
    case "openai": {
      return createOpenAI({
        apiKey: internalAPIKey(),
        baseURL: apiBaseURL({ type: config.type, workspaceServerURL }),
      });
    }
    case "openrouter": {
      return createOpenRouter({
        apiKey: internalAPIKey(),
        baseURL: apiBaseURL({ type: config.type, workspaceServerURL }),
        extraBody: {
          user: config.cacheIdentifier,
        },
        headers: {
          "HTTP-Referer": ATTRIBUTION_URL,
          "X-Title": ATTRIBUTION_NAME,
        },
      });
    }
    case "vercel": {
      return createGateway({
        apiKey: internalAPIKey(),
        baseURL: apiBaseURL({ type: config.type, workspaceServerURL }),
        headers: {
          "http-referer": ATTRIBUTION_URL,
          "x-title": ATTRIBUTION_NAME,
        },
      });
    }
    default: {
      return createOpenAICompatible({
        apiKey: internalAPIKey(),
        baseURL: apiBaseURL({ type: "openai-compatible", workspaceServerURL }),
        name: config.type,
      });
    }
  }
}
