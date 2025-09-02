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

openaiApp.get("/models", async (c) => {
  const providers = c.var.getAIProviders();
  const providersThatSupportOpenAICompletions = providers.filter((provider) => {
    const adapter = getProviderAdapter(provider.type);
    return adapter.features.includes("openai/chat-completions");
  });
  const models = await fetchModelsForProviders(
    providersThatSupportOpenAICompletions,
    { captureException: c.var.captureException },
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

  return c.json(response);
});

openaiApp.post("/chat/completions", async (c) => {
  const providers = c.var.getAIProviders();
  const firstProvider = providers[0];

  if (!firstProvider) {
    return c.json({ error: "No providers found" }, 500);
  }

  const bodyJsonResult = z
    .looseObject({ model: z.string() })
    .safeParse(await c.req.raw.clone().json());

  if (!bodyJsonResult.success) {
    return c.json({ error: "Invalid request body" }, 400);
  }

  const bodyJson = bodyJsonResult.data;
  const originalModelId = bodyJson.model;
  const model = await fetchModelByString(
    {
      id: originalModelId,
      providers,
    },
    { captureException: c.var.captureException },
  );

  if (!model) {
    // Prioritize OpenAI provider if it exists
    const provider =
      providers.find((p) => p.type === "openai") ?? firstProvider;
    const customBody =
      provider.type === "openai"
        ? JSON.stringify({
            ...bodyJson,
            prompt_cache_key: provider.cacheIdentifier,
          })
        : undefined;

    const adapter = getProviderAdapter(provider.type);
    return providerProxy(c, {
      apiKey: provider.apiKey,
      baseURL: provider.baseURL,
      buildURL: adapter.buildURL,
      customBody,
      path: "/v1/chat/completions",
      setAuthHeaders: openaiAdapter.setAuthHeaders,
    });
  }

  const providerName = model.params.provider;
  const provider =
    providers.find((p) => p.type === providerName) ?? firstProvider;
  const adapter = getProviderAdapter(provider.type);

  const updatedBody = JSON.stringify({
    ...bodyJson,
    model: model.providerId,
    ...(provider.type === "openai"
      ? { prompt_cache_key: provider.cacheIdentifier }
      : {}),
  });

  return providerProxy(c, {
    apiKey: provider.apiKey,
    baseURL: provider.baseURL,
    buildURL: adapter.buildURL,
    customBody: updatedBody,
    path: "/v1/chat/completions",
    setAuthHeaders: openaiAdapter.setAuthHeaders,
  });
});

openaiApp.all("*", async (c) => {
  const providers = c.var.getAIProviders();
  const openai = providers.find((provider) => provider.type === "openai");

  // Only allow direct proxy for the rest of the endpoints if user has an
  // OpenAI provider.
  if (!openai) {
    return c.json({ error: "No OpenAI provider found" }, 500);
  }

  const url = new URL(c.req.raw.url);
  const path = url.pathname.replace(PROVIDER_API_PATH.openai, "");
  const method = c.req.raw.method;

  // Parse and rewrite model ID for responses API
  if (path === "/responses" && method === "POST") {
    const bodyJsonResult = z
      .looseObject({ model: z.string() })
      .safeParse(await c.req.raw.clone().json());

    if (!bodyJsonResult.success) {
      return c.json({ error: "Invalid request body" }, 400);
    }

    const originalModelId = bodyJsonResult.data.model;
    const model = await fetchModelByString(
      {
        id: originalModelId,
        // Only OpenAI itself supports responses API
        providers: providers.filter((p) => p.type === "openai"),
      },
      { captureException: c.var.captureException },
    );

    if (model) {
      if (model.params.provider !== "openai") {
        return c.json({ error: "Unsupported provider for responses API" }, 400);
      }

      const updatedBody = JSON.stringify({
        ...bodyJsonResult.data,
        model: model.providerId,
        prompt_cache_key: openai.cacheIdentifier,
      });

      return providerProxy(c, {
        apiKey: openai.apiKey,
        baseURL: openai.baseURL,
        buildURL: openaiAdapter.buildURL,
        customBody: updatedBody,
        path: `/v1${path}`,
        setAuthHeaders: openaiAdapter.setAuthHeaders,
      });
    }
  }

  return providerProxy(c, {
    apiKey: openai.apiKey,
    baseURL: openai.baseURL,
    buildURL: openaiAdapter.buildURL,
    path: `/v1${path}`,
    setAuthHeaders: openaiAdapter.setAuthHeaders,
  });
});
