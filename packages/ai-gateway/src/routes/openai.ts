import { Hono } from "hono";
import { unique } from "radashi";
import { z } from "zod";

import { getProviderAdapter } from "../adapters/all";
import { openaiAdapter } from "../adapters/openai";
import { createBearerAuthMiddleware } from "../lib/auth-middleware";
import { fetchModelByString } from "../lib/fetch-model";
import { fetchModelsForProviders } from "../lib/fetch-models";
import { PROVIDER_API_PATH } from "../lib/provider-paths";
import { providerProxy } from "../lib/provider-proxy";
import { sortModelsByRecommended } from "../lib/sort-models-by-recommended";
import { type AIGatewayEnv } from "../types";

export const openaiApp = new Hono<AIGatewayEnv>();

openaiApp.use("*", createBearerAuthMiddleware());

interface OpenAIModelsResponse {
  data: {
    id: string;
    object: "model";
  }[];
  object: "list";
}

openaiApp.get("/models", async (context) => {
  const configs = context.var.getAIProviderConfigs();
  const configsThatSupportOpenAICompletions = configs.filter((config) => {
    const adapter = getProviderAdapter(config.type);
    return adapter.features.includes("openai/chat-completions");
  });
  const models = await fetchModelsForProviders(
    configsThatSupportOpenAICompletions,
    { captureException: context.var.captureException },
  );

  const sortedModels = sortModelsByRecommended(models);

  const uniqueModels = unique(sortedModels, (model) => model.canonicalId);

  const response: OpenAIModelsResponse = {
    data: uniqueModels.map((model) => ({
      id: model.canonicalId,
      object: "model",
      owned_by: model.author,
    })),
    object: "list",
  };

  return context.json(response);
});

openaiApp.post("/chat/completions", async (context) => {
  const configs = context.var.getAIProviderConfigs();
  const firstConfig = configs[0];

  if (!firstConfig) {
    return context.json({ error: "No provider config found" }, 500);
  }

  const bodyJsonResult = z
    .looseObject({ model: z.string() })
    .safeParse(await context.req.raw.clone().json());

  if (!bodyJsonResult.success) {
    return context.json({ error: "Invalid request body" }, 400);
  }

  const bodyJson = bodyJsonResult.data;
  const originalModelId = bodyJson.model;
  const model = await fetchModelByString(
    {
      configs,
      id: originalModelId,
    },
    { captureException: context.var.captureException },
  );

  if (!model) {
    // Prioritize OpenAI config if it exists
    const config = configs.find((c) => c.type === "openai") ?? firstConfig;
    const customBody =
      config.type === "openai"
        ? JSON.stringify({
            ...bodyJson,
            prompt_cache_key: config.cacheIdentifier,
          })
        : undefined;

    const adapter = getProviderAdapter(config.type);
    return providerProxy(context, {
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      buildURL: adapter.buildURL,
      customBody,
      path: "/v1/chat/completions",
      setAuthHeaders: openaiAdapter.setAuthHeaders,
    });
  }

  const config =
    configs.find((c) => c.type === model.params.provider) ?? firstConfig;
  const adapter = getProviderAdapter(config.type);

  const updatedBody = JSON.stringify({
    ...bodyJson,
    model: model.providerId,
    ...(config.type === "openai"
      ? { prompt_cache_key: config.cacheIdentifier }
      : {}),
  });

  return providerProxy(context, {
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    buildURL: adapter.buildURL,
    customBody: updatedBody,
    path: "/v1/chat/completions",
    setAuthHeaders: openaiAdapter.setAuthHeaders,
  });
});

openaiApp.all("*", async (context) => {
  const configs = context.var.getAIProviderConfigs();
  const openai = configs.find((c) => c.type === "openai");

  // Only allow direct proxy for the rest of the endpoints if user has an
  // OpenAI config.
  if (!openai) {
    return context.json({ error: "No OpenAI config found" }, 500);
  }

  const url = new URL(context.req.raw.url);
  const path = url.pathname.replace(PROVIDER_API_PATH.openai, "");
  const method = context.req.raw.method;

  // Parse and rewrite model ID for responses API
  if (path === "/responses" && method === "POST") {
    const bodyJsonResult = z
      .looseObject({ model: z.string() })
      .safeParse(await context.req.raw.clone().json());

    if (!bodyJsonResult.success) {
      return context.json({ error: "Invalid request body" }, 400);
    }

    const originalModelId = bodyJsonResult.data.model;
    const model = await fetchModelByString(
      {
        id: originalModelId,
        // Only OpenAI itself supports responses API
        configs: configs.filter((c) => c.type === "openai"),
      },
      { captureException: context.var.captureException },
    );

    if (model) {
      if (model.params.provider !== "openai") {
        return context.json(
          { error: "Unsupported provider for responses API" },
          400,
        );
      }

      const updatedBody = JSON.stringify({
        ...bodyJsonResult.data,
        model: model.providerId,
        prompt_cache_key: openai.cacheIdentifier,
      });

      return providerProxy(context, {
        apiKey: openai.apiKey,
        baseURL: openai.baseURL,
        buildURL: openaiAdapter.buildURL,
        customBody: updatedBody,
        path: `/v1${path}`,
        setAuthHeaders: openaiAdapter.setAuthHeaders,
      });
    }
  }

  return providerProxy(context, {
    apiKey: openai.apiKey,
    baseURL: openai.baseURL,
    buildURL: openaiAdapter.buildURL,
    path: `/v1${path}`,
    setAuthHeaders: openaiAdapter.setAuthHeaders,
  });
});
