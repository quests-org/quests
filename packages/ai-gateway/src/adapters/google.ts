import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { Result } from "typescript-result";
import { z } from "zod";

import { addRef } from "../lib/add-ref";
import { providerTypeToAuthor } from "../lib/author";
import { TypedError } from "../lib/errors";
import { fetchJson } from "../lib/fetch-json";
import {
  internalAPIKey as gatewayAPIKey,
  internalAPIKey,
} from "../lib/key-for-provider";
import { PROVIDER_API_PATH } from "../lib/provider-paths";
import { AIGatewayModel } from "../schemas/model";
import { AIGatewayModelURI } from "../schemas/model-uri";
import { setupProviderAdapter } from "./setup";

const GoogleModelsResponseSchema = z.object({
  models: z.array(AIGatewayModel.GoogleSchema),
  nextPageToken: z.string().optional(),
});

function setAuthHeaders(headers: Headers, apiKey: string) {
  headers.set("x-goog-api-key", apiKey);
}

export const googleAdapter = setupProviderAdapter({
  knownModelIds: [
    "models/gemini-2.5-pro",
    "models/gemini-2.5-flash-lite",
    "models/gemini-2.5-flash",
  ],
  metadata: {
    api: {
      defaultBaseURL: "https://generativelanguage.googleapis.com/v1beta",
      keyFormat: "AI",
      keyURL: addRef("https://aistudio.google.com/app/apikey"),
    },
    description: "Gemini and other Google models",
    name: "Google",
    requiresAPIKey: true,
    tags: ["Free tier"],
    url: addRef("https://ai.google.dev/"),
  },
  modelTags: {
    "models/gemini-2.5-pro": ["coding", "recommended", "default"],
  },
  providerType: "google",
}).create(({ buildURL, getModelTags, metadata, providerType }) => ({
  aiSDKModel: (model, { workspaceServerURL }) => {
    return createGoogleGenerativeAI({
      apiKey: internalAPIKey(),
      baseURL: `${workspaceServerURL}${PROVIDER_API_PATH.google}`,
    })(model.providerId);
  },
  buildURL: ({ baseURL, path }) => {
    if (path.startsWith("/v1")) {
      return buildURL({ baseURL, path: `/openai${path.replace(/^\/v1/, "")}` });
    }
    return buildURL({ baseURL, path });
  },
  features: ["openai/chat-completions"],
  fetchModels: (config) =>
    Result.gen(function* () {
      const headers = new Headers({
        "Content-Type": "application/json",
      });
      setAuthHeaders(headers, config.apiKey);

      const data = yield* fetchJson({
        headers,
        url: buildURL({ baseURL: config.baseURL, path: "/models" }),
      });

      const modelsResult = yield* Result.try(
        () => GoogleModelsResponseSchema.parse(data),
        (error) =>
          new TypedError.Parse(
            `Failed to validate models from ${config.type}`,
            { cause: error },
          ),
      );

      const author = providerTypeToAuthor(providerType);
      return modelsResult.models.map((model) => {
        // models/gemini-2.5-pro -> gemini-2.5-pro
        const providerId = AIGatewayModel.ProviderIdSchema.parse(model.name);
        let canonicalModelId = AIGatewayModel.CanonicalIdSchema.parse(
          model.name,
        );
        const [prefix, modelId] = model.name.split("/");
        if (prefix === "models") {
          canonicalModelId = AIGatewayModel.CanonicalIdSchema.parse(modelId);
        }

        const tags = getModelTags(providerId);
        const features: AIGatewayModel.ModelFeatures[] = ["inputText"];

        if (model.supportedGenerationMethods.includes("generateContent")) {
          features.push("outputText");
        }

        if (canonicalModelId.startsWith("gemini-")) {
          features.push("tools");
        }

        const params = { provider: providerType, providerConfigId: config.id };
        return {
          author,
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
            author,
            canonicalId: canonicalModelId,
            params,
          }),
        } satisfies AIGatewayModel.Type;
      });
    }),
  getEnv: (baseURL) => ({
    // For @google/genai
    GEMINI_API_KEY: gatewayAPIKey(),
    GEMINI_BASE_URL: `${baseURL}${PROVIDER_API_PATH.google}`,
    // For @ai-sdk/google
    GOOGLE_GENERATIVE_AI_API_KEY: gatewayAPIKey(),
    GOOGLE_GENERATIVE_AI_BASE_URL: `${baseURL}${PROVIDER_API_PATH.google}`,
  }),
  setAuthHeaders,
  verifyAPIKey: ({ apiKey, baseURL }) => {
    return Result.fromAsync(async () => {
      const headers = new Headers({ "Content-Type": "application/json" });
      setAuthHeaders(headers, apiKey);
      const url = new URL(buildURL({ baseURL, path: "/models" }));

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
