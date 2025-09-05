import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { ATTRIBUTION_NAME, ATTRIBUTION_URL } from "@quests/shared";
import { Result } from "typescript-result";
import { z } from "zod";

import { TypedError } from "../lib/errors";
import { fetchCredits } from "../lib/fetch-credits";
import { fetchJson } from "../lib/fetch-json";
import { isModelNew } from "../lib/is-model-new";
import { internalAPIKey } from "../lib/key-for-provider";
import { modelToURI } from "../lib/model-to-uri";
import { PROVIDER_API_PATH } from "../lib/provider-paths";
import { AIGatewayModel } from "../schemas/model";
import { setupProviderAdapter } from "./setup";

const KNOWN_MODEL_IDS = [
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
  "openai/gpt-4.1",
  "openai/gpt-4.1-mini",
  "openai/gpt-4.1-nano",
  "anthropic/claude-opus-4.1",
  "anthropic/claude-sonnet-4",
  "anthropic/claude-3.7-sonnet",
  "anthropic/claude-3.5-haiku",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "moonshotai/kimi-k2",
  "qwen/qwen3-coder",
  "x-ai/grok-4",
  "x-ai/grok-code-fast-1",
  "z-ai/glm-4.5",
  "z-ai/glm-4.5-air",
] as const;

const OpenRouterModelsResponseSchema = z.object({
  data: z.array(AIGatewayModel.OpenRouterSchema),
});

function setAuthHeaders(headers: Headers, apiKey: string) {
  headers.set("Authorization", `Bearer ${apiKey}`);
}

export const openrouterAdapter = setupProviderAdapter({
  defaultBaseURL: "https://openrouter.ai/api",
  knownModelIds: KNOWN_MODEL_IDS,
  modelTags: {
    "anthropic/claude-3.5-haiku": ["cheap"],
    "anthropic/claude-3.7-sonnet": ["coding"],
    "anthropic/claude-opus-4.1": ["coding", "recommended"],
    "anthropic/claude-sonnet-4": ["coding", "recommended", "default"],
    "google/gemini-2.5-flash": ["recommended", "cheap"],
    "google/gemini-2.5-pro": ["coding", "recommended", "cheap"],
    "moonshotai/kimi-k2": ["coding", "recommended"],
    "openai/gpt-4.1": ["coding"],
    "openai/gpt-4.1-mini": ["coding", "cheap"],
    "openai/gpt-4.1-nano": ["cheap"],
    "openai/gpt-5": ["coding", "recommended"],
    "openai/gpt-5-mini": ["coding", "recommended", "cheap"],
    "openai/gpt-5-nano": ["cheap"],
    "qwen/qwen3-coder": ["coding", "recommended", "cheap"],
    "x-ai/grok-4": ["coding"],
    "x-ai/grok-code-fast-1": ["coding", "recommended"],
    "z-ai/glm-4.5": ["coding", "recommended"],
    "z-ai/glm-4.5-air": ["coding", "recommended"],
  },
  providerType: "openrouter",
}).create(({ buildURL, getModelTags, providerType }) => ({
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
  fetchModels: (provider) =>
    Result.gen(function* () {
      const headers = new Headers({
        "Content-Type": "application/json",
      });
      setAuthHeaders(headers, provider.apiKey);

      const data = yield* fetchJson({
        headers,
        url: buildURL({ baseURL: provider.baseURL, path: "/v1/models" }),
      });

      const modelsResult = yield* Result.try(
        () => OpenRouterModelsResponseSchema.parse(data),
        (error) =>
          new TypedError.Parse(
            `Failed to validate models from ${provider.type}`,
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

        validModels.push({
          author: modelAuthor,
          canonicalId: canonicalModelId,
          features,
          params: { provider: providerType },
          providerId,
          source: {
            providerType,
            value: model,
          },
          tags,
          uri: modelToURI({
            author: modelAuthor,
            canonicalId: canonicalModelId,
            params: { provider: providerType },
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
  verifyAPIKey: ({ apiKey, baseURL }) => {
    return fetchCredits({
      apiKey,
      baseURL,
      cacheIdentifier: "not-used", // Not sent with this request
      type: "openrouter",
    })
      .map(() => true)
      .mapError(
        (error) =>
          new TypedError.VerificationFailed("Failed to verify API key", {
            cause: error,
          }),
      );
  },
}));
