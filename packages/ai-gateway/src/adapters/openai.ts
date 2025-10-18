import {
  createOpenAI,
  type OpenAIResponsesProviderOptions,
} from "@ai-sdk/openai";
import { Result } from "typescript-result";
import { z } from "zod";

import { addRef } from "../lib/add-ref";
import { providerTypeToAuthor } from "../lib/author";
import { TypedError } from "../lib/errors";
import { fetchJson } from "../lib/fetch-json";
import { isModelNew } from "../lib/is-model-new";
import { internalAPIKey } from "../lib/key-for-provider";
import { PROVIDER_API_PATH } from "../lib/provider-paths";
import { AIGatewayModel } from "../schemas/model";
import { AIGatewayModelURI } from "../schemas/model-uri";
import { setupProviderAdapter } from "./setup";

const KNOWN_MODEL_IDS = [
  "gpt-5",
  "gpt-5-codex",
  "gpt-5-mini",
  "gpt-5-nano",
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
] as const;

const OpenAIModelsResponseSchema = z.object({
  data: z.array(AIGatewayModel.OpenAISchema),
  object: z.literal("list").optional(),
});

function setAuthHeaders(headers: Headers, apiKey: string) {
  headers.set("Authorization", `Bearer ${apiKey}`);
}

export const openaiAdapter = setupProviderAdapter({
  knownModelIds: KNOWN_MODEL_IDS,
  metadata: {
    api: {
      defaultBaseURL: "https://api.openai.com",
      keyFormat: "sk-",
      keyURL: addRef("https://platform.openai.com/account/api-keys"),
    },
    description: "GPT-5 and other OpenAI models",
    name: "OpenAI",
    requiresAPIKey: true,
    tags: [],
    url: addRef("https://openai.com"),
  },
  modelTags: {
    "gpt-4.1": ["coding"],
    "gpt-4.1-mini": ["coding"],
    "gpt-5": ["coding", "recommended", "default"],
    "gpt-5-codex": ["coding", "recommended"],
    "gpt-5-mini": ["coding", "recommended"],
  },
  providerType: "openai",
}).create(({ buildURL, getModelTags, metadata, providerType }) => ({
  aiSDKModel: (model, { workspaceServerURL }) => {
    return createOpenAI({
      apiKey: internalAPIKey(),
      baseURL: `${workspaceServerURL}${PROVIDER_API_PATH.openai}`,
    })(model.providerId);
  },
  aiSDKProviderOptions: (model) => {
    if (
      typeof model !== "string" &&
      model.provider === "openai.responses" &&
      // Only gpt-5 and o-series models support reasoning.encrypted_content
      (model.modelId.startsWith("gpt-5") || model.modelId.startsWith("o-"))
    ) {
      return {
        openai: {
          include: ["reasoning.encrypted_content"],
          store: false,
        } satisfies OpenAIResponsesProviderOptions,
      };
    }
    return;
  },
  features: ["openai/chat-completions"],
  fetchModels: (config) =>
    Result.gen(function* () {
      const headers = new Headers({ "Content-Type": "application/json" });
      setAuthHeaders(headers, config.apiKey);

      const data = yield* fetchJson({
        headers,
        url: buildURL({ baseURL: config.baseURL, path: "/v1/models" }),
      });

      const modelsResult = yield* Result.try(
        () => OpenAIModelsResponseSchema.parse(data),
        (error) =>
          new TypedError.Parse(
            `Failed to validate models from ${config.type}`,
            { cause: error },
          ),
      );

      const author = providerTypeToAuthor(providerType);
      return modelsResult.data.map((model) => {
        const providerId = AIGatewayModel.ProviderIdSchema.parse(model.id);
        const canonicalModelId =
          AIGatewayModel.CanonicalIdSchema.parse(providerId);
        const features: AIGatewayModel.ModelFeatures[] = [];

        if (
          model.id.startsWith("gpt-3.5") ||
          model.id.startsWith("gpt-4") ||
          model.id.startsWith("gpt-5") ||
          model.id.startsWith("o-")
        ) {
          features.push("inputText", "outputText", "tools");
        }

        const tags = getModelTags(providerId);
        if (
          model.id.startsWith("gpt-3") ||
          model.id.startsWith("gpt-4-") ||
          model.id.startsWith("gpt-4o-") ||
          model.id.startsWith("o-")
        ) {
          tags.push("legacy");
        }

        if (isModelNew(model.created)) {
          tags.push("new");
        }

        const params = { provider: providerType, providerConfigId: config.id };
        return {
          author,
          canonicalId: canonicalModelId,
          features,
          params,
          providerId,
          providerName: config.displayName ?? metadata.name,
          source: { providerType, value: model },
          tags,
          uri: AIGatewayModelURI.fromModel({
            author,
            canonicalId: canonicalModelId,
            params,
          }),
        } satisfies AIGatewayModel.Type;
      });
    }),
  getEnv: (baseURL) => ({
    OPENAI_API_KEY: internalAPIKey(),
    OPENAI_BASE_URL: `${baseURL}${PROVIDER_API_PATH.openai}`,
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
