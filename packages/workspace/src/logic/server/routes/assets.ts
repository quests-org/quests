import { VERSION_REF_QUERY_PARAM } from "@quests/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";
import ms from "ms";
import fs from "node:fs/promises";

import { absolutePathJoin } from "../../../lib/absolute-path-join";
import { createAppConfig } from "../../../lib/app-config/create";
import { getMimeType } from "../../../lib/get-mime-type";
import { git } from "../../../lib/git";
import { GitCommands } from "../../../lib/git/commands";
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
  const versionRef = c.req.query(VERSION_REF_QUERY_PARAM);

  let fileBuffer: Buffer;

  if (versionRef) {
    const gitResult = await git(
      GitCommands.showFile(versionRef, assetPath),
      appConfig.appDir,
      { signal: AbortSignal.timeout(ms("10 seconds")) },
    );

    if (gitResult.isErr()) {
      return c.notFound();
    }

    fileBuffer = gitResult.value.stdout;
  } else {
    try {
      fileBuffer = await fs.readFile(fullPath);
    } catch {
      return c.notFound();
    }
  }

  const contentType = getMimeType(assetPath);

  return c.body(fileBuffer, 200, {
    "Content-Type": contentType,
  });
});

export const assetsRoute = app;
