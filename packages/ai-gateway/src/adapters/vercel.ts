import { createGateway } from "@ai-sdk/gateway";
import { ATTRIBUTION_NAME, ATTRIBUTION_URL } from "@quests/shared";
import { Result } from "typescript-result";

import { TypedError } from "../lib/errors";
import { internalAPIKey } from "../lib/key-for-provider";
import { modelToURI } from "../lib/model-to-uri";
import { PROVIDER_API_PATH } from "../lib/provider-paths";
import { AIGatewayModel } from "../schemas/model";
import { setupProviderAdapter } from "./setup";

const KNOWN_MODEL_IDS = [
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
  "anthropic/claude-opus-4.1",
  "anthropic/claude-sonnet-4",
  "anthropic/claude-3.7-sonnet",
  "anthropic/claude-3.5-haiku",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "moonshotai/kimi-k2",
  "alibaba/qwen3-coder",
  "xai/grok-4",
  "xai/grok-code-fast-1",
  "zai/glm-4.5",
  "zai/glm-4.5-air",
] as const;

function setAuthHeaders(headers: Headers, apiKey: string) {
  headers.set("Authorization", `Bearer ${apiKey}`);
}

export const vercelAdapter = setupProviderAdapter({
  defaultBaseURL: "https://ai-gateway.vercel.sh",
  knownModelIds: KNOWN_MODEL_IDS,
  modelTags: {
    "alibaba/qwen3-coder": ["coding", "recommended", "cheap"],
    "anthropic/claude-3.5-haiku": ["cheap"],
    "anthropic/claude-3.7-sonnet": ["coding"],
    "anthropic/claude-opus-4.1": ["coding", "recommended"],
    "anthropic/claude-sonnet-4": ["coding", "recommended", "default"],
    "google/gemini-2.5-flash": ["recommended", "cheap"],
    "google/gemini-2.5-pro": ["coding", "recommended", "cheap"],
    "moonshotai/kimi-k2": ["coding", "recommended"],
    "openai/gpt-5": ["coding", "recommended"],
    "openai/gpt-5-mini": ["coding", "recommended", "cheap"],
    "openai/gpt-5-nano": ["cheap"],
    "xai/grok-4": ["coding"],
    "xai/grok-code-fast-1": ["coding", "recommended"],
    "zai/glm-4.5": ["coding", "recommended"],
    "zai/glm-4.5-air": ["coding", "recommended"],
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
  fetchModels: (provider) =>
    Result.gen(async function* () {
      const gatewayProvider = createGateway({ apiKey: provider.apiKey });
      const { models } = await gatewayProvider.getAvailableModels();

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
      return validModels;
    }),
  getEnv: (baseURL: string) => ({
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
