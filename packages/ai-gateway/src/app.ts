import { AI_GATEWAY_API_PATH } from "@quests/shared";
import { Hono } from "hono";
import { logger } from "hono/logger";

import { PROVIDER_PATH } from "./lib/provider-paths";
import { anthropicApp } from "./routes/anthropic";
import { googleApp } from "./routes/google";
import { ollamaApp } from "./routes/ollama";
import { openaiApp } from "./routes/openai";
import { openaiCompatibleApp } from "./routes/openai-compatible";
import { openrouterApp } from "./routes/openrouter";
import { vercelApp } from "./routes/vercel";
import { type AIGatewayEnv } from "./types";

const app = new Hono<AIGatewayEnv>().basePath(AI_GATEWAY_API_PATH);

if (process.env.NODE_ENV === "development") {
  app.use(logger());
}

app.route(PROVIDER_PATH.openai, openaiApp);
app.route(PROVIDER_PATH.anthropic, anthropicApp);
app.route(PROVIDER_PATH.google, googleApp);
app.route(PROVIDER_PATH.openrouter, openrouterApp);
app.route(PROVIDER_PATH.vercel, vercelApp);
app.route(PROVIDER_PATH.ollama, ollamaApp);
app.route(PROVIDER_PATH["openai-compatible"], openaiCompatibleApp);

// Ensure we don't proxy unknown routes
app.all("*", (c) => {
  c.var.captureException(new Error(`Unknown route: ${c.req.raw.url}`), {
    scopes: ["ai-gateway"],
  });
  return c.json({ error: "Not found" }, 404);
});

export const aiGatewayApp = app;
export type AIGatewayApp = typeof aiGatewayApp;
