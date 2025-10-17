import { Hono } from "hono";

import { getProviderAdapter } from "../adapters/all";
import { createBearerAuthMiddleware } from "../lib/auth-middleware";
import { PROVIDER_API_PATH } from "../lib/provider-paths";
import { providerProxy } from "../lib/provider-proxy";
import { type AIGatewayEnv } from "../types";

export const ollamaApp = new Hono<AIGatewayEnv>();

ollamaApp.use("*", createBearerAuthMiddleware());

ollamaApp.all("*", async (c) => {
  const providers = c.var.getAIProviderConfigs();
  const ollama = providers.find((provider) => provider.type === "ollama");

  if (!ollama) {
    return c.json({ error: "No Ollama provider found" }, 500);
  }

  const { apiKey, baseURL } = ollama;
  const adapter = getProviderAdapter("ollama");
  const url = new URL(c.req.raw.url);
  const path = url.pathname.replace(PROVIDER_API_PATH.ollama, "");

  return providerProxy(c, {
    apiKey,
    baseURL,
    buildURL: adapter.buildURL,
    path: `/api${path}`,
    setAuthHeaders: adapter.setAuthHeaders,
  });
});
