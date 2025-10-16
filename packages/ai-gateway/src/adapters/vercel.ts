import { createGateway } from "@ai-sdk/gateway";
import { ATTRIBUTION_NAME, ATTRIBUTION_URL } from "@quests/shared";
import { Result } from "typescript-result";

import { addRef, REF_PARAM_KEY, REF_PARAM_VALUE } from "../lib/add-ref";
import { getCachedResult, setCachedResult } from "../lib/cache";
import { TypedError } from "../lib/errors";
import { internalAPIKey } from "../lib/key-for-provider";
import { modelToURI } from "../lib/model-to-uri";
import { PROVIDER_API_PATH } from "../lib/provider-paths";
import { AIGatewayModel } from "../schemas/model";
import { setupProviderAdapter } from "./setup";

const KNOWN_MODEL_IDS = [
  "alibaba/qwen3-coder",
  "alibaba/qwen3-coder-plus",
  "alibaba/qwen3-max",
  "anthropic/claude-3.5-haiku",
  "anthropic/claude-3.7-sonnet",
  "anthropic/claude-haiku-4.5",
  "anthropic/claude-opus-4.1",
  "anthropic/claude-sonnet-4",
  "anthropic/claude-sonnet-4.5",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "moonshotai/kimi-k2",
  "moonshotai/kimi-k2-0905",
  "openai/gpt-5",
  "openai/gpt-5-codex",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
  "xai/grok-4",
  "xai/grok-code-fast-1",
  "zai/glm-4.5",
  "zai/glm-4.5-air",
  "zai/glm-4.6",
] as const;

function setAuthHeaders(headers: Headers, apiKey: string) {
  headers.set("Authorization", `Bearer ${apiKey}`);
}

export const vercelAdapter = setupProviderAdapter({
  knownModelIds: KNOWN_MODEL_IDS,
  metadata: {
    api: {
      defaultBaseURL: "https://ai-gateway.vercel.sh",
      keyFormat: "vck_",
      keyURL: `https://vercel.com/d?to=${encodeURIComponent(`/[team]/~/ai/api-keys?${REF_PARAM_KEY}=${REF_PARAM_VALUE}`)}&title=${encodeURIComponent("Get an API Key")}`,
    },
    description: "Access hundreds of models across many providers",
    name: "Vercel AI Gateway",
    requiresAPIKey: true,
    tags: ["$5 free credit with card"],
    url: addRef("https://vercel.com/ai-gateway"),
  },
  modelTags: {
    "alibaba/qwen3-coder": ["coding", "recommended"],
    "alibaba/qwen3-coder-plus": ["coding", "recommended"],
    "alibaba/qwen3-max": ["coding"],
    "anthropic/claude-3.7-sonnet": ["coding"],
    "anthropic/claude-haiku-4.5": ["coding", "recommended"],
    "anthropic/claude-opus-4.1": ["coding", "recommended"],
    "anthropic/claude-sonnet-4": ["coding", "recommended"],
    "anthropic/claude-sonnet-4.5": ["coding", "recommended", "default"],
    "google/gemini-2.5-flash": ["recommended"],
    "google/gemini-2.5-pro": ["coding", "recommended"],
    "moonshotai/kimi-k2": ["coding"],
    "moonshotai/kimi-k2-0905": ["coding", "recommended"],
    "openai/gpt-5": ["coding", "recommended"],
    "openai/gpt-5-codex": ["coding", "recommended"],
    "openai/gpt-5-mini": ["coding", "recommended"],
    "openai/gpt-5-nano": ["recommended"],
    "xai/grok-4": ["coding"],
    "xai/grok-code-fast-1": ["coding", "recommended"],
    "zai/glm-4.5": ["coding", "recommended"],
    "zai/glm-4.5-air": ["coding", "recommended"],
    "zai/glm-4.6": ["coding", "recommended"],
  },
  providerType: "vercel",
}).create(({ buildURL, getModelTags, providerType }) => ({
  aiSDKModel: (model, { workspaceServerURL }) => {
    return createGateway({
      apiKey: internalAPIKey(),
      baseURL: `${workspaceServerURL}${PROVIDER_API_PATH.vercel}`,
      headers: {
        "http-referer": ATTRIBUTION_URL,
        "x-title": ATTRIBUTION_NAME,
      },
    })(model.providerId);
  },
  features: ["openai/chat-completions"],
  fetchModels: (provider) => {
    return Result.gen(function* () {
      const cacheKey = `vercel-models-${provider.apiKey}`;
      const cachedModels = getCachedResult<AIGatewayModel.Type[]>(cacheKey);

      if (cachedModels !== undefined) {
        return cachedModels;
      }

      const gatewayProvider = createGateway({ apiKey: provider.apiKey });
      const { models } = yield* Result.try(
        async () => await gatewayProvider.getAvailableModels(),
        (error) =>
          new TypedError.Fetch(
            "Fetching models from Vercel AI Gateway failed",
            { cause: error },
          ),
      );

      const validModels: AIGatewayModel.Type[] = [];

      for (const model of models) {
        const providerId = AIGatewayModel.ProviderIdSchema.parse(model.id);
        const [modelAuthor, modelId] = providerId.split("/");
        if (!modelAuthor || !modelId) {
          return Result.error(
            new TypedError.Parse(`Invalid model ID for vercel: ${model.id}`),
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

        if (model.modelType === "language") {
          // So far, it seems like Vercel only has tool calling models
          features.push("tools", "inputText", "outputText");
        }

        const tags = getModelTags(providerId);

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

      setCachedResult(cacheKey, validModels);
      return validModels;
    });
  },
  getEnv: (baseURL) => ({
    AI_GATEWAY_API_KEY: internalAPIKey(),
    AI_GATEWAY_BASE_URL: `${baseURL}${PROVIDER_API_PATH.vercel}`,
  }),
  setAuthHeaders,
  verifyAPIKey: ({ apiKey, baseURL }) => {
    return Result.fromAsync(async () => {
      const headers = new Headers({ "Content-Type": "application/json" });
      setAuthHeaders(headers, apiKey);
      const url = new URL(buildURL({ baseURL, path: "/v1/models" }));

      const result = Result.try(
        async () => {
          const response = await fetch(url.toString(), { headers });
          if (!response.ok) {
            throw new Error("API key verification failed");
          }
          return true;
        },
        (error) =>
          new TypedError.VerificationFailed("Failed to verify API key", {
            cause: error,
          }),
      );
      return result;
    });
  },
}));
