import { AI_GATEWAY_API_PATH } from "@quests/shared";
import { Hono } from "hono";
import { logger } from "hono/logger";

import { PROVIDERS_PATH } from "./constants";
import { createAuthMiddleware } from "./lib/auth-middleware";
import { providerApp } from "./routes/provider";
import { type AIGatewayEnv } from "./types";

const app = new Hono<AIGatewayEnv>().basePath(AI_GATEWAY_API_PATH);

if (process.env.NODE_ENV === "development") {
  app.use(logger());
}

app.use("*", createAuthMiddleware());

app.route(PROVIDERS_PATH, providerApp);

// Ensure we don't proxy unknown routes
app.all("*", (c) => {
  c.var.captureException(new Error(`Unknown route: ${c.req.raw.url}`), {
    scopes: ["ai-gateway"],
  });
  return c.json({ error: "Not found" }, 404);
});

export const aiGatewayApp = app;
export type AIGatewayApp = typeof aiGatewayApp;
