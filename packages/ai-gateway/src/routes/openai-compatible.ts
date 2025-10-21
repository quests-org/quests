import { AI_GATEWAY_API_PATH } from "@quests/shared";
import { type Context, Hono } from "hono";
import { proxy } from "hono/proxy";
import { unique } from "radashi";
import { z } from "zod";

import { OPENAI_COMPATIBLE_PATH, PROVIDERS_PATH } from "../constants";
import { fetchModelByString } from "../lib/fetch-model";
import { fetchModelsForProviders } from "../lib/fetch-models";
import { isOpenAICompatible } from "../lib/providers/is-openai-compatible";
import { openAICompatibleURL } from "../lib/providers/openai-compatible-url";
import { setProviderAuthHeaders } from "../lib/providers/set-auth-headers";
import { setAttributionHeaders } from "../lib/set-attribution-headers";
import { sortModelsByRecommended } from "../lib/sort-models-by-recommended";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { SlashPrefixedPathSchema } from "../schemas/slash-prefixed-path";
import { type AIGatewayEnv } from "../types";

export const openaiCompatibleApp = new Hono<AIGatewayEnv>();

interface OpenAIModelsResponse {
  data: {
    id: string;
    object: "model";
  }[];
  object: "list";
}

openaiCompatibleApp.get("/models", async (context) => {
  const configs = context.var.getAIProviderConfigs();
  const openAICompatibleConfigs = configs.filter((config) => {
    return isOpenAICompatible(config.type);
  });
  const models = await fetchModelsForProviders(openAICompatibleConfigs, {
    captureException: context.var.captureException,
  });

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

openaiCompatibleApp.post("/chat/completions", async (context) => {
  const configs = context.var.getAIProviderConfigs();
  const firstConfig = configs[0];

  if (!firstConfig) {
    return context.json({ error: "No provider config found" }, 500);
  }

  let bodyJson;
  try {
    const rawJson = (await context.req.raw.clone().json()) as unknown;
    const bodyJsonResult = z
      .looseObject({ model: z.string() })
      .safeParse(rawJson);

    if (!bodyJsonResult.success) {
      return context.json({ error: "Invalid request body" }, 400);
    }

    bodyJson = bodyJsonResult.data;
  } catch {
    return context.json({ error: "Failed to parse request body" }, 400);
  }
  const originalModelId = bodyJson.model;
  const model = await fetchModelByString(
    {
      configs,
      id: originalModelId,
    },
    { captureException: context.var.captureException },
  );

  if (!model) {
    // No model? Direct proxy, prioritizing OpenAI config if it exists
    const config = configs.find((c) => c.type === "openai") ?? firstConfig;
    const customBody =
      config.type === "openai"
        ? JSON.stringify({
            ...bodyJson,
            prompt_cache_key: config.cacheIdentifier,
          })
        : undefined;

    return providerProxy(context, {
      config,
      customBody,
      path: "/chat/completions",
    });
  }

  const config = configs.find((c) => c.id === model.params.providerConfigId);
  if (!config) {
    return context.json({ error: "No provider config found" }, 500);
  }

  const updatedBody = JSON.stringify({
    ...bodyJson,
    model: model.providerId,
    ...(config.type === "openai"
      ? { prompt_cache_key: config.cacheIdentifier }
      : {}),
  });

  return providerProxy(context, {
    config,
    customBody: updatedBody,
    path: "/chat/completions",
  });
});

openaiCompatibleApp.all("*", async (context) => {
  const configs = context.var.getAIProviderConfigs();
  const openai = configs.find((c) => c.type === "openai");

  // Only allow direct proxy for the rest of the endpoints if user has an
  // OpenAI config.
  if (!openai) {
    return context.json({ error: "No OpenAI config found" }, 500);
  }

  const rawPath = context.req.path.replace(
    [AI_GATEWAY_API_PATH, PROVIDERS_PATH, OPENAI_COMPATIBLE_PATH].join(""),
    "",
  );
  const pathResult = SlashPrefixedPathSchema.safeParse(rawPath);
  if (!pathResult.success) {
    return context.json({ error: "Invalid path" }, 400);
  }

  const path = pathResult.data;
  const method = context.req.method;

  // Parse and rewrite model ID for responses API
  if (path === "/responses" && method === "POST") {
    let bodyJsonData;
    try {
      const rawJson = (await context.req.raw.clone().json()) as unknown;
      const bodyJsonResult = z
        .looseObject({ model: z.string() })
        .safeParse(rawJson);

      if (!bodyJsonResult.success) {
        return context.json({ error: "Invalid request body" }, 400);
      }

      bodyJsonData = bodyJsonResult.data;
    } catch {
      return context.json({ error: "Failed to parse request body" }, 400);
    }

    const originalModelId = bodyJsonData.model;
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
        ...bodyJsonData,
        model: model.providerId,
        prompt_cache_key: openai.cacheIdentifier,
      });

      return providerProxy(context, {
        config: openai,
        customBody: updatedBody,
        path,
      });
    }
  }

  return providerProxy(context, {
    config: openai,
    path,
  });
});

function providerProxy(
  context: Context<AIGatewayEnv>,
  {
    config,
    customBody,
    path,
  }: {
    config: AIGatewayProviderConfig.Type;
    customBody?: string;
    path: `/${string}`;
  },
) {
  const url = new URL(context.req.raw.url);
  const targetUrl = new URL(openAICompatibleURL({ config, path }));
  targetUrl.search = url.search;

  const headers = new Headers(context.req.raw.headers);
  setAttributionHeaders(headers);
  setProviderAuthHeaders(headers, { ...config, type: "openai" });

  const body = customBody ?? context.req.raw.body;
  if (customBody) {
    headers.set(
      "Content-Length",
      Buffer.byteLength(customBody, "utf8").toString(),
    );
  }

  return proxy(targetUrl.toString(), {
    body,
    headers,
    method: context.req.raw.method,
  });
}
