import { Hono } from "hono";

import { getProviderAdapter } from "../adapters/all";
import { createBearerAuthMiddleware } from "../lib/auth-middleware";
import { PROVIDER_API_PATH } from "../lib/provider-paths";
import { providerProxy } from "../lib/provider-proxy";
import { type AIGatewayEnv } from "../types";

export const openrouterApp = new Hono<AIGatewayEnv>();

openrouterApp.use("*", createBearerAuthMiddleware());

openrouterApp.all("*", async (c) => {
  const providers = c.var.getAIProviderConfigs();
  const openrouter = providers.find(
    (provider) => provider.type === "openrouter",
  );

  if (!openrouter) {
    return c.json({ error: "No OpenRouter provider found" }, 500);
  }

  const { apiKey, baseURL } = openrouter;
  const adapter = getProviderAdapter("openrouter");
  const url = new URL(c.req.raw.url);
  const path = url.pathname.replace(PROVIDER_API_PATH.openrouter, "");

  return providerProxy(c, {
    apiKey,
    baseURL,
    buildURL: adapter.buildURL,
    path: `/v1${path}`,
    setAuthHeaders: adapter.setAuthHeaders,
  });
});
