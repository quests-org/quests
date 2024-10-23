import { Hono } from "hono";
import { proxy } from "hono/proxy";
import fs from "node:fs/promises";

import { absolutePathJoin } from "../../../lib/absolute-path-join";
import {
  SHIM_DEV_HOST,
  SHIM_IFRAME_BASE_PATH,
  SHIM_SCRIPTS,
} from "../constants";
import { type WorkspaceServerEnv } from "../types";

const app = new Hono<WorkspaceServerEnv>();

app.get(`${SHIM_IFRAME_BASE_PATH}/*`, async (c) => {
  const isWebSocket = c.req.header("upgrade")?.toLowerCase() === "websocket";
  if (isWebSocket) {
    // Not supported in Hono proxy
    return c.text("WebSocket not supported", 426); // 426 Upgrade Required
  }

  const shimClientDir = c.get("shimClientDir");
  if (shimClientDir === "dev-server") {
    return await proxy(`${SHIM_DEV_HOST}${c.req.path}`, {
      headers: c.req.raw.headers,
    });
  }

  const isHTML = c.req.header("accept")?.includes("text/html");
  if (isHTML) {
    const shimIFrameHTML = await fs.readFile(
      absolutePathJoin(shimClientDir, SHIM_SCRIPTS.iframeHTML),
      "utf8",
    );
    return c.text(shimIFrameHTML, 200, {
      "Cache-Control": "no-cache",
      "Content-Type": "text/html; charset=utf-8",
    });
  } else {
    const shimIFrameJavaScript = await fs.readFile(
      absolutePathJoin(shimClientDir, SHIM_SCRIPTS.iframeJS),
      "utf8",
    );
    return c.text(shimIFrameJavaScript, 200, {
      "Cache-Control": "no-cache",
      "Content-Type": "application/javascript; charset=utf-8",
    });
  }
});

export const shimIFrameRoute = app;
