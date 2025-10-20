import { addRef } from "@quests/shared";
import { createOllama } from "ollama-ai-provider-v2";
import { Result } from "typescript-result";
import { z } from "zod";

import { providerTypeToAuthor } from "../lib/author";
import { TypedError } from "../lib/errors";
import { fetchJson } from "../lib/fetch-json";
import { generateModelName } from "../lib/generate-model-name";
import { getModelTags } from "../lib/get-model-tags";
import { isModelNew } from "../lib/is-model-new";
import { internalAPIKey } from "../lib/key-for-provider";
import { PROVIDER_API_PATH } from "../lib/provider-paths";
import { AIGatewayModel } from "../schemas/model";
import { AIGatewayModelURI } from "../schemas/model-uri";
import { setupProviderAdapter } from "./setup";

function setAuthHeaders(headers: Headers, apiKey: string) {
  headers.set("Authorization", `Bearer ${apiKey}`);
}

export const ollamaAdapter = setupProviderAdapter({
  metadata: {
    api: {
      defaultBaseURL: "http://localhost:11434",
    },
    description: "Run local models on your own machine",
    name: "Ollama",
    requiresAPIKey: false,
    tags: [],
    url: addRef("https://docs.ollama.com"),
  },
  providerType: "ollama",
}).create(({ buildURL, metadata, providerType }) => ({
  aiSDKModel: (model, { workspaceServerURL }) => {
    return createOllama({
      baseURL: `${workspaceServerURL}${PROVIDER_API_PATH.ollama}`,
      headers: {
        Authorization: `Bearer ${internalAPIKey()}`,
      },
    })(model.providerId);
  },
  features: ["openai/chat-completions"],
  fetchModels: (config) =>
    Result.gen(function* () {
      const headers = new Headers({ "Content-Type": "application/json" });
      setAuthHeaders(headers, config.apiKey);

      const data = yield* fetchJson({
        cache: false, // Models change frequently on local, so no cache
        headers,
        url: buildURL({ baseURL: config.baseURL, path: "/v1/models" }),
      });

      const modelsResult = yield* Result.try(
        () =>
          z.object({ data: z.array(AIGatewayModel.OllamaSchema) }).parse(data),
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

        const tags = getModelTags(canonicalModelId);

        if (isModelNew(model.created)) {
          tags.push("new");
        }

        const params = { provider: providerType, providerConfigId: config.id };
        return {
          author,
          canonicalId: canonicalModelId,
          features: ["inputText", "outputText", "tools"],
          name: generateModelName(canonicalModelId),
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
    OLLAMA_API_KEY: internalAPIKey(),
    OLLAMA_BASE_URL: `${baseURL}${PROVIDER_API_PATH.ollama}`,
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
            throw new Error("Response not OK");
          }
          return true;
        },
        (error) =>
          new TypedError.VerificationFailed(
            "Ollama doesn't appear to be running",
            {
              cause: error,
            },
          ),
      );
      return result;
    });
  },
}));
