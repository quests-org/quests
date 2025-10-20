import { createGateway } from "@ai-sdk/gateway";
import {
  addRef,
  ATTRIBUTION_NAME,
  ATTRIBUTION_URL,
  REF_PARAM_KEY,
  REF_PARAM_VALUE,
} from "@quests/shared";
import { Result } from "typescript-result";

import { getCachedResult, setCachedResult } from "../lib/cache";
import { TypedError } from "../lib/errors";
import { getModelTags } from "../lib/get-model-tags";
import { internalAPIKey } from "../lib/key-for-provider";
import { PROVIDER_API_PATH } from "../lib/provider-paths";
import { AIGatewayModel } from "../schemas/model";
import { AIGatewayModelURI } from "../schemas/model-uri";
import { setupProviderAdapter } from "./setup";

function setAuthHeaders(headers: Headers, apiKey: string) {
  headers.set("Authorization", `Bearer ${apiKey}`);
}

export const vercelAdapter = setupProviderAdapter({
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
  providerType: "vercel",
}).create(({ buildURL, metadata, providerType }) => ({
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
  fetchModels: (config) => {
    return Result.gen(function* () {
      const cacheKey = `vercel-models-${config.apiKey}`;
      const cachedModels = getCachedResult<AIGatewayModel.Type[]>(cacheKey);

      if (cachedModels !== undefined) {
        return cachedModels;
      }

      const gatewayProvider = createGateway({ apiKey: config.apiKey });
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

        const canonicalModelId =
          AIGatewayModel.CanonicalIdSchema.parse(modelId);
        const features: AIGatewayModel.ModelFeatures[] = [];

        if (model.modelType === "language") {
          // So far, it seems like Vercel only has tool calling models
          features.push("tools", "inputText", "outputText");
        }

        const tags = getModelTags(canonicalModelId);

        const params = { provider: providerType, providerConfigId: config.id };
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
