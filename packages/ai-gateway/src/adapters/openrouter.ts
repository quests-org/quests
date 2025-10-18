import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { addRef, ATTRIBUTION_NAME, ATTRIBUTION_URL } from "@quests/shared";
import { Result } from "typescript-result";
import { z } from "zod";

import { RECOMMENDED_TAG } from "../constants";
import { TypedError } from "../lib/errors";
import { fetchJson } from "../lib/fetch-json";
import { isModelNew } from "../lib/is-model-new";
import { internalAPIKey } from "../lib/key-for-provider";
import { PROVIDER_API_PATH } from "../lib/provider-paths";
import { AIGatewayModel } from "../schemas/model";
import { AIGatewayModelURI } from "../schemas/model-uri";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { setupProviderAdapter } from "./setup";

const OpenRouterCreditsResponseSchema = z.object({
  data: z.object({
    total_credits: z.number(),
    total_usage: z.number(),
  }),
});

const KNOWN_MODEL_IDS = [
  "anthropic/claude-3.5-haiku",
  "anthropic/claude-3.7-sonnet",
  "anthropic/claude-haiku-4.5",
  "anthropic/claude-opus-4.1",
  "anthropic/claude-sonnet-4",
  "anthropic/claude-sonnet-4.5",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "moonshotai/kimi-k2-0905",
  "moonshotai/kimi-k2",
  "openai/gpt-4.1",
  "openai/gpt-4.1-mini",
  "openai/gpt-4.1-nano",
  "openai/gpt-5",
  "openai/gpt-5-codex",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
  "qwen/qwen3-coder",
  "qwen/qwen3-coder-plus",
  "qwen/qwen3-max",
  "x-ai/grok-4",
  "x-ai/grok-code-fast-1",
  "z-ai/glm-4.5",
  "z-ai/glm-4.5-air",
  "z-ai/glm-4.6",
] as const;

const OpenRouterModelsResponseSchema = z.object({
  data: z.array(AIGatewayModel.OpenRouterSchema),
});

function setAuthHeaders(headers: Headers, apiKey: string) {
  headers.set("Authorization", `Bearer ${apiKey}`);
}

export const openrouterAdapter = setupProviderAdapter({
  knownModelIds: KNOWN_MODEL_IDS,
  metadata: {
    api: {
      defaultBaseURL: "https://openrouter.ai/api",
      keyFormat: "sk-or-",
      keyURL: addRef("https://openrouter.ai/settings/keys"),
    },
    description: "Access an extensive catalog of models across providers",
    name: "OpenRouter",
    requiresAPIKey: true,
    tags: [RECOMMENDED_TAG, "Free models"],
    url: "https://openrouter.ai",
  },
  modelTags: {
    "anthropic/claude-3.7-sonnet": ["coding"],
    "anthropic/claude-haiku-4.5": ["coding", "recommended", "default"],
    "anthropic/claude-opus-4.1": ["coding", "recommended"],
    "anthropic/claude-sonnet-4": ["coding", "recommended"],
    "anthropic/claude-sonnet-4.5": ["coding", "recommended"],
    "google/gemini-2.5-flash": ["recommended"],
    "google/gemini-2.5-pro": ["coding", "recommended"],
    "moonshotai/kimi-k2": ["coding"],
    "moonshotai/kimi-k2-0905": ["coding", "recommended"],
    "openai/gpt-4.1": ["coding"],
    "openai/gpt-4.1-mini": ["coding"],
    "openai/gpt-5": ["coding", "recommended"],
    "openai/gpt-5-codex": ["coding", "recommended"],
    "openai/gpt-5-mini": ["coding", "recommended"],
    "openai/gpt-5-nano": ["recommended"],
    "qwen/qwen3-coder": ["coding", "recommended"],
    "qwen/qwen3-coder-plus": ["coding", "recommended"],
    "qwen/qwen3-max": ["coding"],
    "x-ai/grok-4": ["coding"],
    "x-ai/grok-code-fast-1": ["coding", "recommended"],
    "z-ai/glm-4.5": ["coding", "recommended"],
    "z-ai/glm-4.5-air": ["coding", "recommended"],
    "z-ai/glm-4.6": ["coding", "recommended"],
  },
  providerType: "openrouter",
}).create(({ buildURL, getModelTags, metadata, providerType }) => {
  function fetchCredits(
    config: Pick<AIGatewayProviderConfig.Type, "apiKey" | "baseURL">,
  ) {
    return Result.fromAsync(async () => {
      const headers = new Headers({ "Content-Type": "application/json" });
      setAuthHeaders(headers, config.apiKey);
      const url = new URL(
        buildURL({
          baseURL: config.baseURL,
          path: "/v1/credits",
        }),
      );

      const result = Result.try(
        async () => {
          const response = await fetch(url.toString(), { headers });
          if (!response.ok) {
            throw new Error("Failed to fetch credits");
          }
          const creditsData = OpenRouterCreditsResponseSchema.parse(
            await response.json(),
          );

          return creditsData.data;
        },
        (error) =>
          new TypedError.Fetch("Failed to fetch credits", {
            cause: error,
          }),
      );
      return result;
    });
  }

  return {
    aiSDKModel: (model, { cacheIdentifier, workspaceServerURL }) => {
      return createOpenRouter({
        apiKey: internalAPIKey(),
        baseURL: `${workspaceServerURL}${PROVIDER_API_PATH.openrouter}`,
        extraBody: {
          user: cacheIdentifier,
        },
        headers: {
          "HTTP-Referer": ATTRIBUTION_URL,
          "X-Title": ATTRIBUTION_NAME,
        },
      })(model.providerId);
    },
    features: ["openai/chat-completions"],
    fetchCredits,
    fetchModels: (config) =>
      Result.gen(function* () {
        const headers = new Headers({
          "Content-Type": "application/json",
        });
        setAuthHeaders(headers, config.apiKey);

        const data = yield* fetchJson({
          headers,
          url: buildURL({ baseURL: config.baseURL, path: "/v1/models" }),
        });

        const modelsResult = yield* Result.try(
          () => OpenRouterModelsResponseSchema.parse(data),
          (error) =>
            new TypedError.Parse(
              `Failed to validate models from ${config.type}`,
              { cause: error },
            ),
        );

        const validModels: AIGatewayModel.Type[] = [];
        for (const model of modelsResult.data) {
          const providerId = AIGatewayModel.ProviderIdSchema.parse(model.id);
          const [modelAuthor, modelId] = providerId.split("/");
          if (!modelAuthor || !modelId) {
            return Result.error(
              new TypedError.Parse(
                `Invalid model ID for openrouter: ${model.id}`,
              ),
            );
          }

          const canonicalModelId = yield* Result.try(
            () => AIGatewayModel.CanonicalIdSchema.parse(modelId),
            (error) =>
              new TypedError.Parse(
                `Failed to parse canonical model ID: ${modelId}`,
                { cause: error },
              ),
          );

          const features: AIGatewayModel.ModelFeatures[] = [];

          if (model.architecture.input_modalities.includes("text")) {
            features.push("inputText");
          }
          if (model.architecture.output_modalities.includes("text")) {
            features.push("outputText");
          }
          if (model.supported_parameters?.includes("tools")) {
            features.push("tools");
          }

          const tags = getModelTags(providerId);
          if (isModelNew(model.created)) {
            tags.push("new");
          }

          const params = {
            provider: providerType,
            providerConfigId: config.id,
          };
          validModels.push({
            author: modelAuthor,
            canonicalId: canonicalModelId,
            features,
            params,
            providerId,
            providerName: config.displayName ?? metadata.name,
            source: {
              providerType,
              value: model,
            },
            tags,
            uri: AIGatewayModelURI.fromModel({
              author: modelAuthor,
              canonicalId: canonicalModelId,
              params,
            }),
          } satisfies AIGatewayModel.Type);
        }
        return validModels;
      }),
    getEnv: (baseURL) => ({
      OPENROUTER_API_KEY: internalAPIKey(),
      OPENROUTER_BASE_URL: `${baseURL}${PROVIDER_API_PATH.openrouter}`,
    }),
    setAuthHeaders,
    verifyAPIKey: (config) => {
      return fetchCredits(config)
        .map(() => true)
        .mapError(
          (error) =>
            new TypedError.VerificationFailed("Failed to verify API key", {
              cause: error,
            }),
        );
    },
  };
});
