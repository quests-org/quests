import { AI_GATEWAY_API_PATH } from "@quests/shared";
import { Hono } from "hono";
import { proxy } from "hono/proxy";

import { PROVIDERS_PATH } from "../constants";
import { apiURL } from "../lib/providers/api-url";
import { setProviderAuthHeaders } from "../lib/providers/set-auth-headers";
import { setAttributionHeaders } from "../lib/set-attribution-headers";
import { SlashPrefixedPathSchema } from "../schemas/slash-prefixed-path";
import { type AIGatewayEnv } from "../types";

export const providerApp = new Hono<AIGatewayEnv>();

providerApp.all("/:providerConfigId/*", async (context) => {
  const { providerConfigId } = context.req.param();
  const configs = context.var.getAIProviderConfigs();
  if (configs.length === 0) {
    return context.json({ error: "No AI providers have been configured" }, 500);
  }
  const config = configs.find((c) => c.id === providerConfigId);

  if (!config) {
    return context.json(
      { error: `No provider config found for ${providerConfigId}` },
      500,
    );
  }

  const url = new URL(context.req.raw.url);
  const path = url.pathname.replace(
    [AI_GATEWAY_API_PATH, PROVIDERS_PATH, `/${providerConfigId}`].join(""),
    "",
  );

  const pathResult = SlashPrefixedPathSchema.safeParse(path);
  if (!pathResult.success) {
    return context.json({ error: "Invalid path" }, 400);
  }

  const targetUrl = new URL(apiURL({ config, path: pathResult.data }));
  targetUrl.search = url.search;

  const headers = new Headers(context.req.raw.headers);
  setAttributionHeaders(headers);
  setProviderAuthHeaders(headers, config);

  return proxy(targetUrl.toString(), {
    body: context.req.raw.body,
    headers,
    method: context.req.raw.method,
  });
});
