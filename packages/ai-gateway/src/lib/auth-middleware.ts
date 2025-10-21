import { type MiddlewareHandler } from "hono";

import { type AIGatewayEnv } from "../types";
import { getInternalKey } from "./key-for-provider";

export function createAuthMiddleware(): MiddlewareHandler<AIGatewayEnv> {
  return async (c, next) => {
    const expectedKey = getInternalKey();

    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      if (token === expectedKey) {
        await next();
        return;
      }
    }

    const xApiKey = c.req.header("X-API-Key");
    if (xApiKey === expectedKey) {
      await next();
      return;
    }

    const googApiKey = c.req.header("x-goog-api-key");
    if (googApiKey === expectedKey) {
      await next();
      return;
    }

    return c.json({ error: "Missing or invalid Quests internal API key" }, 401);
  };
}
