import { Hono } from "hono";
import mime from "mime";
import fs from "node:fs/promises";
import path from "node:path";

import { createAppConfig } from "../../../lib/app-config/create";
import { APPS_SERVER_API_PATH } from "../constants";
import { type WorkspaceServerEnv } from "../types";
import { uriDetailsForHost } from "../uri-details-for-host";

const app = new Hono<WorkspaceServerEnv>().basePath(APPS_SERVER_API_PATH);

app.get("/assets/*", async (c) => {
  const uriDetails = uriDetailsForHost(c.req.header("host") || "");

  if (uriDetails.isErr()) {
    return c.notFound();
  }

  const { subdomain } = uriDetails.value;
  const appConfig = createAppConfig({
    subdomain,
    workspaceConfig: c.var.workspaceConfig,
  });

  const assetPath = c.req.path.replace(`${APPS_SERVER_API_PATH}/assets/`, "");

  if (!assetPath || assetPath.includes("..")) {
    return c.notFound();
  }

  const fullPath = path.join(appConfig.appDir, assetPath);

  try {
    const fileBuffer = await fs.readFile(fullPath);
    const contentType = mime.getType(fullPath) ?? "application/octet-stream";

    return c.body(fileBuffer, 200, {
      "Content-Type": contentType,
    });
  } catch {
    return c.notFound();
  }
});

export const assetsRoute = app;
