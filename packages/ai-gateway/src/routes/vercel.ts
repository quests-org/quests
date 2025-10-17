import { Hono } from "hono";

import { getProviderAdapter } from "../adapters/all";
import { createBearerAuthMiddleware } from "../lib/auth-middleware";
import { PROVIDER_API_PATH } from "../lib/provider-paths";
import { providerProxy } from "../lib/provider-proxy";
import { type AIGatewayEnv } from "../types";

export const vercelApp = new Hono<AIGatewayEnv>();

vercelApp.use("*", createBearerAuthMiddleware());

vercelApp.all("*", async (c) => {
  const providers = c.var.getAIProviderConfigs();
  const vercel = providers.find((provider) => provider.type === "vercel");

  if (!vercel) {
    return c.json({ error: "No Vercel provider found" }, 500);
  }

  const { apiKey, baseURL } = vercel;
  const adapter = getProviderAdapter("vercel");
  const url = new URL(c.req.raw.url);
  const path = url.pathname.replace(PROVIDER_API_PATH.vercel, "");

  return providerProxy(c, {
    apiKey,
    baseURL,
    buildURL: adapter.buildURL,
    path: `/v1/ai${path}`,
    setAuthHeaders: adapter.setAuthHeaders,
  });
});
