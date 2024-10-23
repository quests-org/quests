import { ATTRIBUTION_NAME, ATTRIBUTION_URL } from "@quests/shared";
import { type Context } from "hono";
import { proxy } from "hono/proxy";

import { type ProviderAdapter } from "../adapters/setup";
import { type AIGatewayEnv } from "../types";

interface ProviderProxyOptions {
  apiKey: string;
  baseURL?: string;
  buildURL: ProviderAdapter["buildURL"];
  customBody?: string;
  path: string;
  setAuthHeaders: ProviderAdapter["setAuthHeaders"];
}

export function providerProxy(
  c: Context<AIGatewayEnv>,
  {
    apiKey,
    baseURL,
    buildURL,
    customBody,
    path,
    setAuthHeaders,
  }: ProviderProxyOptions,
) {
  const url = new URL(c.req.raw.url);
  const targetUrl = new URL(buildURL({ baseURL, path }));
  targetUrl.search = url.search;

  const headers = new Headers(c.req.raw.headers);
  headers.set("X-Title", ATTRIBUTION_NAME);
  headers.set("HTTP-Referer", ATTRIBUTION_URL);
  setAuthHeaders(headers, apiKey);

  const body = customBody ?? c.req.raw.body;
  if (customBody) {
    headers.set(
      "Content-Length",
      Buffer.byteLength(customBody, "utf8").toString(),
    );
  }

  return proxy(targetUrl.toString(), {
    body,
    headers,
    method: c.req.raw.method,
  });
}
