import { Hono } from "hono";
import { cors } from "hono/cors";
import fs from "node:fs/promises";

import { absolutePathJoin } from "../../../lib/absolute-path-join";
import { createAppConfig } from "../../../lib/app-config/create";
import { getMimeType } from "../../../lib/get-mime-type";
import { APPS_SERVER_API_PATH } from "../constants";
import { type WorkspaceServerEnv } from "../types";
import { uriDetailsForHost } from "../uri-details-for-host";

const app = new Hono<WorkspaceServerEnv>().basePath(APPS_SERVER_API_PATH);

app.use("/assets/*", cors());

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

  const fullPath = absolutePathJoin(appConfig.appDir, assetPath);

  try {
    const fileBuffer = await fs.readFile(fullPath);
    const contentType = await getMimeType(fullPath);

    return c.body(fileBuffer, 200, {
      "Content-Type": contentType,
    });
  } catch {
    return c.notFound();
  }
});

export const assetsRoute = app;
