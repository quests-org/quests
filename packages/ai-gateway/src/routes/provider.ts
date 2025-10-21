import { AI_GATEWAY_API_PATH } from "@quests/shared";
import { Hono } from "hono";
import { proxy } from "hono/proxy";

import { OPENAI_COMPATIBLE_PATH, PROVIDERS_PATH } from "../constants";
import { apiURL } from "../lib/providers/api-url";
import { setProviderAuthHeaders } from "../lib/providers/set-auth-headers";
import { setAttributionHeaders } from "../lib/set-attribution-headers";
import { SlashPrefixedPathSchema } from "../schemas/slash-prefixed-path";
import { type AIGatewayEnv } from "../types";
import { openaiCompatibleApp } from "./openai-compatible";

export const providerApp = new Hono<AIGatewayEnv>();

providerApp.route(OPENAI_COMPATIBLE_PATH, openaiCompatibleApp);

providerApp.all("/:providerType/*", async (context) => {
  const { providerType } = context.req.param();
  const configs = context.var.getAIProviderConfigs();
  if (configs.length === 0) {
    return context.json({ error: "No AI providers have been configured" }, 500);
  }
  const config = configs.find((c) => c.type === providerType);

  if (!config) {
    return context.json(
      { error: `No provider config found for ${providerType}` },
      500,
    );
  }

  const url = new URL(context.req.raw.url);
  const path = url.pathname.replace(
    [AI_GATEWAY_API_PATH, PROVIDERS_PATH, `/${providerType}`].join(""),
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
