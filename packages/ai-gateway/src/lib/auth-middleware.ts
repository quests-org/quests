import { type MiddlewareHandler } from "hono";

import { type AIGatewayEnv } from "../types";
import { getInternalKey } from "./key-for-provider";

export function createBearerAuthMiddleware(): MiddlewareHandler<AIGatewayEnv> {
  return async (c, next) => {
    const authHeader = c.req.header("Authorization");
    const expectedKey = getInternalKey();

    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ error: "Missing Quests internal Bearer header" }, 401);
    }

    const token = authHeader.slice(7);
    if (token !== expectedKey) {
      return c.json({ error: "Invalid Quests internal API key" }, 401);
    }

    await next();
    return;
  };
}

export function createHeaderAuthMiddleware(
  headerName: string,
): MiddlewareHandler<AIGatewayEnv> {
  return async (c, next) => {
    const apiKeyHeader = c.req.header(headerName);
    const expectedKey = getInternalKey();

    if (!apiKeyHeader) {
      return c.json(
        { error: `Missing Quests internal ${headerName} header` },
        401,
      );
    }

    if (apiKeyHeader !== expectedKey) {
      return c.json({ error: "Invalid Quests internal API key" }, 401);
    }

    await next();
    return;
  };
}
