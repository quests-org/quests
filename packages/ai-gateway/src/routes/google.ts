import { Hono } from "hono";

import { getProviderAdapter } from "../adapters/all";
import { createHeaderAuthMiddleware } from "../lib/auth-middleware";
import { PROVIDER_API_PATH } from "../lib/provider-paths";
import { providerProxy } from "../lib/provider-proxy";
import { type AIGatewayEnv } from "../types";

export const googleApp = new Hono<AIGatewayEnv>();

googleApp.use("*", createHeaderAuthMiddleware("x-goog-api-key"));

googleApp.all("*", async (c) => {
  const providers = c.var.getAIProviders();
  const google = providers.find((provider) => provider.type === "google");

  if (!google) {
    return c.json({ error: "No Google provider found" }, 500);
  }

  const { apiKey, baseURL } = google;
  const adapter = getProviderAdapter("google");
  const url = new URL(c.req.raw.url);
  let path = url.pathname.replace(PROVIDER_API_PATH.google, "");
  if (path.startsWith("/v1beta")) {
    path = path.replace("/v1beta", "");
  }

  return providerProxy(c, {
    apiKey,
    baseURL,
    buildURL: adapter.buildURL,
    path,
    setAuthHeaders: adapter.setAuthHeaders,
  });
});
