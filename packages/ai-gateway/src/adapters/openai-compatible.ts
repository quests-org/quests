import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { addRef, AI_GATEWAY_API_KEY_NOT_NEEDED } from "@quests/shared";
import { Result } from "typescript-result";
import { z } from "zod";

import { providerTypeToAuthor } from "../lib/author";
import { TypedError } from "../lib/errors";
import { fetchJson } from "../lib/fetch-json";
import { getModelTags } from "../lib/get-model-tags";
import { internalAPIKey } from "../lib/key-for-provider";
import { PROVIDER_API_PATH } from "../lib/provider-paths";
import { AIGatewayModel } from "../schemas/model";
import { AIGatewayModelURI } from "../schemas/model-uri";
import { setupProviderAdapter } from "./setup";

function setAuthHeaders(headers: Headers, apiKey: string) {
  if (apiKey !== AI_GATEWAY_API_KEY_NOT_NEEDED) {
    headers.set("Authorization", `Bearer ${apiKey}`);
  }
}

export const openaiCompatibleAdapter = setupProviderAdapter({
  metadata: {
    api: {
      defaultBaseURL: "",
    },
    description: "OpenAI-compatible endpoint with custom base URL",
    name: "OpenAI Compatible",
    requiresAPIKey: true,
    tags: [],
    url: addRef("https://quests.dev"),
  },
  providerType: "openai-compatible",
}).create(({ buildURL, metadata, providerType }) => ({
  aiSDKModel: (model, { workspaceServerURL }) => {
    return createOpenAICompatible({
      apiKey: internalAPIKey(),
      baseURL: `${workspaceServerURL}${PROVIDER_API_PATH["openai-compatible"]}`,
      name: "openai-compatible",
    })(model.providerId);
  },
  features: ["openai/chat-completions"],
  fetchModels: (config) =>
    Result.gen(function* () {
      const headers = new Headers({ "Content-Type": "application/json" });
      setAuthHeaders(headers, config.apiKey);
      if (!config.baseURL) {
        return Result.error(
          new TypedError.Fetch(
            "Base URL is required for OpenAI-compatible providers",
          ),
        );
      }

      const data = yield* fetchJson({
        // Don't cache local models, they change frequently and load fast
        cache: !config.baseURL.startsWith("http://localhost"),
        headers,
        url: buildURL({ baseURL: config.baseURL, path: "/models" }),
      });

      const modelsResult = yield* Result.try(
        () =>
          z.object({ data: z.array(AIGatewayModel.OpenAISchema) }).parse(data),
        (error) =>
          new TypedError.Parse(
            `Failed to validate models from ${config.type}`,
            { cause: error },
          ),
      );

      const author = providerTypeToAuthor(providerType);
      return modelsResult.data.map((model) => {
        const providerId = AIGatewayModel.ProviderIdSchema.parse(model.id);
        const canonicalId = AIGatewayModel.CanonicalIdSchema.parse(providerId);
        const tags = getModelTags(canonicalId);
        const params = {
          provider: providerType,
          providerConfigId: config.id,
          providerSubType: config.subType,
        };
        return {
          author,
          canonicalId,
          features: ["inputText", "outputText", "tools"],
          params,
          providerId,
          providerName: config.displayName ?? metadata.name,
          source: { providerType, value: model },
          tags,
          uri: AIGatewayModelURI.fromModel({
            author,
            canonicalId,
            params,
          }),
        } satisfies AIGatewayModel.Type;
      });
    }),
  getEnv: (baseURL) => ({
    OPENAI_API_KEY: internalAPIKey(),
    OPENAI_BASE_URL: `${baseURL}${PROVIDER_API_PATH["openai-compatible"]}`,
  }),
  setAuthHeaders,
  verifyAPIKey: ({ apiKey, baseURL }) => {
    return Result.fromAsync(async () => {
      if (!baseURL) {
        return Result.error(
          new TypedError.VerificationFailed(
            "Base URL is required for OpenAI-compatible providers",
          ),
        );
      }

      const headers = new Headers({ "Content-Type": "application/json" });
      setAuthHeaders(headers, apiKey);

      const url = new URL(buildURL({ baseURL, path: "/models" }));

      const result = Result.try(
        async () => {
          const response = await fetch(url.toString(), { headers });
          if (!response.ok) {
            const errorText = await response.text().catch(() => "");
            throw new Error(
              `HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ""}`,
            );
          }
          return true;
        },
        (error) =>
          new TypedError.VerificationFailed(
            "Failed to connect to OpenAI-compatible endpoint. Please check your base URL and API key.",
            { cause: error },
          ),
      );
      return result;
    });
  },
}));
