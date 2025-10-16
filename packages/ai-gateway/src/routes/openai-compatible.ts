import { Hono } from "hono";

import { getProviderAdapter } from "../adapters/all";
import { createBearerAuthMiddleware } from "../lib/auth-middleware";
import { PROVIDER_API_PATH } from "../lib/provider-paths";
import { providerProxy } from "../lib/provider-proxy";
import { type AIGatewayEnv } from "../types";

export const openaiCompatibleApp = new Hono<AIGatewayEnv>();

openaiCompatibleApp.use("*", createBearerAuthMiddleware());

openaiCompatibleApp.all("*", async (c) => {
  const providers = c.var.getAIProviders();
  const openaiCompatible = providers.find(
    (provider) => provider.type === "openai-compatible",
  );

  if (!openaiCompatible) {
    return c.json({ error: "No OpenAI-compatible provider found" }, 500);
  }

  const { apiKey, baseURL } = openaiCompatible;
  const adapter = getProviderAdapter("openai-compatible");
  const url = new URL(c.req.raw.url);
  const path = url.pathname.replace(PROVIDER_API_PATH["openai-compatible"], "");

  return providerProxy(c, {
    apiKey,
    baseURL,
    buildURL: adapter.buildURL,
    path,
    setAuthHeaders: adapter.setAuthHeaders,
  });
});
