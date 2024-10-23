import { Hono } from "hono";
import { proxy } from "hono/proxy";
import fs from "node:fs/promises";

import { absolutePathJoin } from "../../../lib/absolute-path-join";
import { SHIM_DEV_HOST, SHIM_SCRIPT_PATH, SHIM_SCRIPTS } from "../constants";
import { type WorkspaceServerEnv } from "../types";

const app = new Hono<WorkspaceServerEnv>();

app.get(SHIM_SCRIPT_PATH, async (c) => {
  const shimClientDir = c.get("shimClientDir");

  if (shimClientDir === "dev-server") {
    try {
      return await proxy(`${SHIM_DEV_HOST}${c.req.path}`, {
        headers: c.req.raw.headers,
      });
    } catch (error) {
      return c.text(
        `const error = document.createElement('div');
      error.style.color = 'red';
      error.style.padding = '20px';
      error.style.fontFamily = 'monospace';
      error.textContent = 'Error loading shim script (${c.req.path}): ${error instanceof Error ? error.message : "Unknown error"}';
      document.body.appendChild(error);`,
        200,
        {
          "Cache-Control": "no-cache",
          "Content-Type": "application/javascript; charset=utf-8",
        },
      );
    }
  } else {
    const shimClientJavaScript = await fs.readFile(
      absolutePathJoin(shimClientDir, SHIM_SCRIPTS.shimJS),
      "utf8",
    );
    return c.text(shimClientJavaScript, 200, {
      "Cache-Control": "no-cache",
      "Content-Type": "application/javascript; charset=utf-8",
    });
  }
});

export const shimScriptRoute = app;
