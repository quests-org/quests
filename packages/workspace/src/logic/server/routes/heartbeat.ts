import { APPS_SERVER_API_PATH } from "@quests/shared";
import { Hono } from "hono";

import { createAppConfig } from "../../../lib/app-config/create";
import { isRunnable, registryAppExists } from "../../../lib/app-dir-utils";
import { folderNameForSubdomain } from "../../../lib/folder-name-for-subdomain";
import { git } from "../../../lib/git";
import { GitCommands } from "../../../lib/git/commands";
import {
  isPreviewExpired,
  removeExpiredPreview,
} from "../../../lib/preview-cache";
import { projectSubdomainForSubdomain } from "../../../lib/project-subdomain-for-subdomain";
import { type AppStatus, type HeartbeatResponse } from "../../../types";
import { type WorkspaceServerEnv } from "../types";
import { uriDetailsForHost } from "../uri-details-for-host";

const app = new Hono<WorkspaceServerEnv>().basePath(APPS_SERVER_API_PATH);

app.post("/heartbeat", async (c) => {
  const uriDetails = uriDetailsForHost(c.req.header("host") || "");

  if (uriDetails.isErr()) {
    return c.json<HeartbeatResponse>({ errors: [], status: "not-found" });
  }

  const { subdomain } = uriDetails.value;

  const appConfig = createAppConfig({
    subdomain,
    workspaceConfig: c.var.workspaceConfig,
  });

  const runtimeRef = c.var.getRuntimeRef(subdomain);

  if (!runtimeRef) {
    const canRun = await isRunnable(appConfig.appDir);
    if (canRun) {
      if (appConfig.type === "preview") {
        const cacheTimeMs = appConfig.workspaceConfig.previewCacheTimeMs;
        if (cacheTimeMs !== undefined) {
          const expired = await isPreviewExpired(appConfig.appDir, cacheTimeMs);
          if (expired) {
            try {
              await removeExpiredPreview(
                appConfig.appDir,
                appConfig.workspaceConfig,
              );

              c.var.parentRef.send({
                type: "workspaceServer.heartbeat",
                value: {
                  appConfig,
                  createdAt: Date.now(),
                  shouldCreate: true,
                },
              });

              return c.json<HeartbeatResponse>({
                errors: [],
                status: "loading",
              });
            } catch (error) {
              c.var.workspaceConfig.captureException(
                error instanceof Error ? error : new Error(String(error)),
                {
                  scopes: ["workspace"],
                },
              );
            }
          }
        }
      }

      c.var.parentRef.send({
        type: "workspaceServer.heartbeat",
        value: {
          appConfig,
          createdAt: Date.now(),
          shouldCreate: false,
        },
      });
      return c.json<HeartbeatResponse>({
        errors: [],
        status: "loading",
      });
    }

    if (appConfig.type === "preview") {
      // Non-existent previews for valid registry apps will be created on demand
      // Need to verify that the registry app exists
      const doesAppExist = await registryAppExists({
        folderName: appConfig.folderName,
        workspaceConfig: c.var.workspaceConfig,
      });
      if (!doesAppExist) {
        return c.json<HeartbeatResponse>({
          errors: [],
          status: "not-found",
        });
      }
      c.var.parentRef.send({
        type: "workspaceServer.heartbeat",
        value: {
          appConfig,
          createdAt: Date.now(),
          shouldCreate: true,
        },
      });
      return c.json<HeartbeatResponse>({
        errors: [],
        status: "loading",
      });
    }

    if (appConfig.type === "version") {
      // Non-existent versions for valid git refs will be created on demand
      // Need to verify that: 1) the project exists, 2) the git ref exists
      const projectSubdomain = projectSubdomainForSubdomain(
        appConfig.subdomain,
      );
      const gitRefFolderResult = folderNameForSubdomain(appConfig.subdomain);

      if (gitRefFolderResult.isErr()) {
        return c.json<HeartbeatResponse>({
          errors: [],
          status: "not-found",
        });
      }

      const gitRef = gitRefFolderResult.value;

      // Check if the project exists
      const projectConfig = createAppConfig({
        subdomain: projectSubdomain,
        workspaceConfig: c.var.workspaceConfig,
      });

      const projectExists = await isRunnable(projectConfig.appDir);
      if (!projectExists) {
        return c.json<HeartbeatResponse>({
          errors: [],
          status: "not-found",
        });
      }

      // Check if the git ref exists in the project (validate the version could be created)
      const gitRefResult = await git(
        GitCommands.revParse(gitRef),
        projectConfig.appDir,
        { signal: AbortSignal.timeout(5000) },
      );

      if (gitRefResult.isErr()) {
        return c.json<HeartbeatResponse>({
          errors: [],
          status: "not-found",
        });
      }

      c.var.parentRef.send({
        type: "workspaceServer.heartbeat",
        value: {
          appConfig,
          createdAt: Date.now(),
          shouldCreate: true,
        },
      });
      return c.json<HeartbeatResponse>({
        errors: [],
        status: "loading",
      });
    }

    return c.json<HeartbeatResponse>({
      errors: [],
      status: "not-runnable",
    });
  }

  c.var.parentRef.send({
    type: "workspaceServer.heartbeat",
    value: {
      appConfig,
      createdAt: Date.now(),
      shouldCreate: false,
    },
  });

  const snapshot = runtimeRef.getSnapshot();
  // Must cast because not type safe, even though `hasTag` is type safe
  const tags = snapshot.tags as Set<AppStatus>;
  const firstTag = tags.values().next().value ?? "unknown";

  return c.json<HeartbeatResponse>(
    { errors: snapshot.context.errors, status: firstTag },
    200,
  );
});

export const heartbeatRoute = app;
