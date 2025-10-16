import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { AI_GATEWAY_API_KEY_NOT_NEEDED } from "@quests/shared";
import { Result } from "typescript-result";
import { z } from "zod";

import { addRef } from "../lib/add-ref";
import { providerTypeToAuthor } from "../lib/author";
import { TypedError } from "../lib/errors";
import { fetchJson } from "../lib/fetch-json";
import { internalAPIKey } from "../lib/key-for-provider";
import { modelToURI } from "../lib/model-to-uri";
import { PROVIDER_API_PATH } from "../lib/provider-paths";
import { AIGatewayModel } from "../schemas/model";
import { setupProviderAdapter } from "./setup";

function setAuthHeaders(headers: Headers, apiKey: string) {
  if (apiKey !== AI_GATEWAY_API_KEY_NOT_NEEDED) {
    headers.set("Authorization", `Bearer ${apiKey}`);
  }
}

export const openaiCompatibleAdapter = setupProviderAdapter({
  knownModelIds: [],
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
  modelTags: {},
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
  fetchModels: (provider) =>
    Result.gen(function* () {
      const headers = new Headers({ "Content-Type": "application/json" });
      setAuthHeaders(headers, provider.apiKey);

      const data = yield* fetchJson({
        cache: false,
        headers,
        url: buildURL({ baseURL: provider.baseURL, path: "/models" }),
      });

      const modelsResult = yield* Result.try(
        () =>
          z.object({ data: z.array(AIGatewayModel.OpenAISchema) }).parse(data),
        (error) =>
          new TypedError.Parse(
            `Failed to validate models from ${provider.type}`,
            { cause: error },
          ),
      );

      const author = providerTypeToAuthor(providerType);
      return modelsResult.data.map((model) => {
        const providerId = AIGatewayModel.ProviderIdSchema.parse(model.id);
        const canonicalModelId =
          AIGatewayModel.CanonicalIdSchema.parse(providerId);

        return {
          author,
          canonicalId: canonicalModelId,
          features: ["inputText", "outputText", "tools"],
          params: { provider: providerType },
          providerId,
          providerName: provider.displayName ?? metadata.name,
          source: { providerType, value: model },
          tags: [],
          uri: modelToURI({
            author,
            canonicalId: canonicalModelId,
            params: { provider: providerType },
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
