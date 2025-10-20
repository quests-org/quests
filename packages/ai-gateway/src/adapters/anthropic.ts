import { createAnthropic } from "@ai-sdk/anthropic";
import { addRef } from "@quests/shared";
import { Result } from "typescript-result";
import { z } from "zod";

import { providerTypeToAuthor } from "../lib/author";
import { canonicalizeAnthropicModelId } from "../lib/canonicalize-model-id";
import { TypedError } from "../lib/errors";
import { fetchJson } from "../lib/fetch-json";
import { generateModelName } from "../lib/generate-model-name";
import { getModelTags } from "../lib/get-model-tags";
import { isModelNew } from "../lib/is-model-new";
import {
  internalAPIKey as gatewayAPIKey,
  internalAPIKey,
} from "../lib/key-for-provider";
import { PROVIDER_API_PATH } from "../lib/provider-paths";
import { AIGatewayModel } from "../schemas/model";
import { AIGatewayModelURI } from "../schemas/model-uri";
import { setupProviderAdapter } from "./setup";

const AnthropicModelsResponseSchema = z.object({
  data: z.array(AIGatewayModel.AnthropicSchema),
  first_id: z.string().optional(),
  has_more: z.boolean().optional(),
  last_id: z.string().optional(),
});

function setAuthHeaders(headers: Headers, apiKey: string) {
  headers.set("x-api-key", apiKey);
  headers.set("anthropic-version", "2023-06-01");
}

const DEFAULT_BASE_URL = "https://api.anthropic.com";

export const anthropicAdapter = setupProviderAdapter({
  metadata: {
    api: {
      defaultBaseURL: DEFAULT_BASE_URL,
      keyFormat: "sk-ant-",
      keyURL: addRef("https://console.anthropic.com/settings/keys"),
    },
    description: "Claude Sonnet, Opus, and other Anthropic models",
    name: "Anthropic",
    requiresAPIKey: true,
    tags: [],
    url: addRef("https://anthropic.com"),
  },
  providerType: "anthropic",
}).create(({ buildURL, metadata, providerType }) => ({
  aiSDKModel: (model, { workspaceServerURL }) => {
    return createAnthropic({
      apiKey: internalAPIKey(),
      baseURL: `${workspaceServerURL}${PROVIDER_API_PATH.anthropic}`,
    })(model.providerId);
  },
  buildURL: ({ baseURL, path }) => {
    // If missing a /v1, add it (Anthropic SDK expects no /v1 but AI SDK does)
    const finalPath = /^\/v\d+/.test(path) ? path : `/v1${path}`;
    return buildURL({ baseURL, path: finalPath });
  },
  features: ["openai/chat-completions"],
  fetchModels: (config, { captureException }) =>
    Result.gen(function* () {
      const headers = new Headers({
        "Content-Type": "application/json",
      });
      setAuthHeaders(headers, config.apiKey);

      const url = new URL(
        buildURL({ baseURL: config.baseURL, path: "/v1/models" }),
      );
      url.searchParams.set("limit", "1000");

      const data = yield* fetchJson({
        headers,
        url: url.toString(),
      });

      const modelsResult = yield* Result.try(
        () => AnthropicModelsResponseSchema.parse(data),
        (error) =>
          new TypedError.Parse(
            `Failed to validate models from ${config.type}`,
            { cause: error },
          ),
      );

      if (modelsResult.has_more) {
        // Logged so we can later fix it if they add pagination
        captureException(
          new Error(
            `Anthropic models response indicates pagination (has_more: true), but pagination is not supported`,
          ),
        );
      }

      const author = providerTypeToAuthor(providerType);
      return modelsResult.data.map((model) => {
        const providerId = AIGatewayModel.ProviderIdSchema.parse(model.id);
        const normalizedModelId = canonicalizeAnthropicModelId(model.id);
        const canonicalModelId =
          AIGatewayModel.CanonicalIdSchema.parse(normalizedModelId);

        const tags = getModelTags(canonicalModelId);
        if (isModelNew(model.created_at)) {
          tags.push("new");
        }

        const params = { provider: providerType, providerConfigId: config.id };
        return {
          author,
          canonicalId: canonicalModelId,
          features: ["inputText", "outputText", "tools"],
          name: model.display_name ?? generateModelName(canonicalModelId),
          params,
          providerId,
          providerName: config.displayName ?? metadata.name,
          source: {
            providerType,
            value: model,
          },
          tags,
          uri: AIGatewayModelURI.fromModel({
            author,
            canonicalId: canonicalModelId,
            params,
          }),
        } satisfies AIGatewayModel.Type;
      });
    }),
  getEnv: (baseURL: string) => ({
    ANTHROPIC_API_KEY: gatewayAPIKey(),
    ANTHROPIC_BASE_URL: `${baseURL}${PROVIDER_API_PATH.anthropic}`,
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
