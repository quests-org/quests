import { createAnthropic } from "@ai-sdk/anthropic";
import { Result } from "typescript-result";
import { z } from "zod";

import { addRef } from "../lib/add-ref";
import { providerTypeToAuthor } from "../lib/author";
import { TypedError } from "../lib/errors";
import { fetchJson } from "../lib/fetch-json";
import { isModelNew } from "../lib/is-model-new";
import {
  internalAPIKey as gatewayAPIKey,
  internalAPIKey,
} from "../lib/key-for-provider";
import { modelToURI } from "../lib/model-to-uri";
import { PROVIDER_API_PATH } from "../lib/provider-paths";
import { AIGatewayModel } from "../schemas/model";
import { setupProviderAdapter } from "./setup";

const KNOWN_MODEL_IDS = [
  "claude-3-5-haiku-20241022",
  "claude-3-5-sonnet-20240620",
  "claude-3-7-sonnet-20250219",
  "claude-3-haiku-20240307",
  "claude-haiku-4-5-20251001",
  "claude-opus-4-1-20250805",
  "claude-opus-4-20250514",
  "claude-sonnet-4-20250514",
  "claude-sonnet-4-5-20250929",
] as const;

type KnownModelId = (typeof KNOWN_MODEL_IDS)[number];

// Best effort to reduce duplication of model IDs on OpenAI models endpoint
// Derived from OpenRouter's model IDs
const CANONICAL_MAP: Partial<Record<KnownModelId, string>> = {
  "claude-3-5-haiku-20241022": "claude-3.5-haiku",
  "claude-3-7-sonnet-20250219": "claude-3.7-sonnet",
  "claude-3-haiku-20240307": "claude-3-haiku",
  "claude-haiku-4-5-20251001": "claude-haiku-4.5",
  "claude-opus-4-1-20250805": "claude-opus-4.1",
  "claude-opus-4-20250514": "claude-opus-4",
  "claude-sonnet-4-5-20250929": "claude-sonnet-4.5",
  "claude-sonnet-4-20250514": "claude-sonnet-4",
};

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
  knownModelIds: KNOWN_MODEL_IDS,
  metadata: {
    api: {
      defaultBaseURL: DEFAULT_BASE_URL,
      keyFormat: "sk-ant-",
      keyURL: addRef("https://console.anthropic.com/account/keys"),
    },
    description: "Claude Sonnet, Opus, and other Anthropic models",
    name: "Anthropic",
    requiresAPIKey: true,
    tags: [],
    url: addRef("https://anthropic.com"),
  },
  modelTags: {
    "claude-3-7-sonnet-20250219": ["coding"],
    "claude-haiku-4-5-20251001": ["coding", "recommended", "default"],
    "claude-opus-4-1-20250805": ["coding", "recommended"],
    "claude-sonnet-4-5-20250929": ["coding", "recommended"],
    "claude-sonnet-4-20250514": ["coding", "recommended"],
  },
  providerType: "anthropic",
}).create(({ buildURL, getModelTags, metadata, providerType }) => ({
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
  fetchModels: (provider, { captureException }) =>
    Result.gen(function* () {
      const headers = new Headers({
        "Content-Type": "application/json",
      });
      setAuthHeaders(headers, provider.apiKey);

      const url = new URL(
        buildURL({ baseURL: provider.baseURL, path: "/v1/models" }),
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
            `Failed to validate models from ${provider.type}`,
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
        const normalizedModelId =
          CANONICAL_MAP[model.id as KnownModelId] ?? model.id;
        const canonicalModelId =
          AIGatewayModel.CanonicalIdSchema.parse(normalizedModelId);

        const tags = getModelTags(providerId);
        if (isModelNew(model.created_at)) {
          tags.push("new");
        }

        return {
          author,
          canonicalId: canonicalModelId,
          features: ["inputText", "outputText", "tools"],
          params: { provider: providerType },
          providerId,
          providerName: provider.displayName ?? metadata.name,
          source: {
            providerType,
            value: model,
          },
          tags,
          uri: modelToURI({
            author,
            canonicalId: canonicalModelId,
            params: { provider: providerType },
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
