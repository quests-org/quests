import { Hono } from "hono";

import { getProviderAdapter } from "../adapters/all";
import { createHeaderAuthMiddleware } from "../lib/auth-middleware";
import { PROVIDER_API_PATH } from "../lib/provider-paths";
import { providerProxy } from "../lib/provider-proxy";
import { type AIGatewayEnv } from "../types";

export const anthropicApp = new Hono<AIGatewayEnv>();

anthropicApp.use("*", createHeaderAuthMiddleware("X-API-Key"));

anthropicApp.all("*", async (c) => {
  const providers = c.var.getAIProviderConfigs();
  const anthropic = providers.find((provider) => provider.type === "anthropic");

  if (!anthropic) {
    return c.json({ error: "No Anthropic provider found" }, 500);
  }

  const { apiKey, baseURL } = anthropic;
  const adapter = getProviderAdapter("anthropic");
  const url = new URL(c.req.raw.url);
  const path = url.pathname.replace(PROVIDER_API_PATH.anthropic, "");

  return providerProxy(c, {
    apiKey,
    baseURL,
    buildURL: adapter.buildURL,
    path,
    setAuthHeaders: adapter.setAuthHeaders,
  });
});
