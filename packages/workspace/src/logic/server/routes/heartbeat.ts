import { APPS_SERVER_API_PATH } from "@quests/shared";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { isEqual } from "radashi";
import { type Subscription } from "xstate";

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
import { type RuntimeSnapshot } from "../../../machines/runtime";
import { type AppError, type AppStatus } from "../../../types";
import { type WorkspaceServerEnv } from "../types";
import { uriDetailsForHost } from "../uri-details-for-host";

export interface HeartbeatResponse {
  errors: AppError[];
  status: AppStatus;
}

const app = new Hono<WorkspaceServerEnv>().basePath(APPS_SERVER_API_PATH);

app.get("/heartbeat-stream", (c) => {
  const uriDetails = uriDetailsForHost(c.req.header("host") || "");

  if (uriDetails.isErr()) {
    return streamSSE(c, async (stream) => {
      await stream.writeSSE({
        data: JSON.stringify({
          errors: [
            {
              createdAt: Date.now(),
              message: "URI details error",
              type: "runtime",
            },
          ],
          status: "not-found",
        } satisfies HeartbeatResponse),
        event: "heartbeat",
      });
      return new Promise(() => {
        /* Block forever so the client doesn't keep trying to connect */
      });
    });
  }

  const { subdomain } = uriDetails.value;

  const appConfig = createAppConfig({
    subdomain,
    workspaceConfig: c.var.workspaceConfig,
  });

  return streamSSE(c, async (stream) => {
    let lastResponse: HeartbeatResponse | null = null;
    const pushResponse = async (
      response: HeartbeatResponse | { errors?: AppError[]; status: AppStatus },
    ) => {
      const normalizedResponse: HeartbeatResponse = {
        errors: response.errors ?? [],
        status: response.status,
      };

      if (isEqual(normalizedResponse, lastResponse)) {
        return;
      }
      lastResponse = normalizedResponse;
      await stream.writeSSE({
        data: JSON.stringify(normalizedResponse),
        event: "heartbeat",
      });
      return;
    };

    function pushSnapshotResponse(snapshot: RuntimeSnapshot) {
      const tags = snapshot.tags as Set<AppStatus>;
      const firstTag = tags.values().next().value ?? "unknown";

      return pushResponse({
        errors: snapshot.context.errors,
        status: firstTag,
      });
    }

    const sendHeartbeat = async () => {
      const runtimeRef = c.var.getRuntimeRef(subdomain);

      if (!runtimeRef) {
        const canRun = await isRunnable(appConfig.appDir);
        if (canRun) {
          if (appConfig.type === "preview") {
            const cacheTimeMs = appConfig.workspaceConfig.previewCacheTimeMs;
            if (cacheTimeMs !== undefined) {
              const expired = await isPreviewExpired(
                appConfig.appDir,
                cacheTimeMs,
              );
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

                  await pushResponse({ status: "loading" });
                  return;
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
          return pushResponse({ status: "loading" });
        }

        if (appConfig.type === "preview") {
          const doesAppExist = await registryAppExists({
            folderName: appConfig.folderName,
            workspaceConfig: c.var.workspaceConfig,
          });
          if (!doesAppExist) {
            return pushResponse({ status: "not-found" });
          }
          c.var.parentRef.send({
            type: "workspaceServer.heartbeat",
            value: {
              appConfig,
              createdAt: Date.now(),
              shouldCreate: true,
            },
          });
          return pushResponse({ status: "loading" });
        }

        if (appConfig.type === "version") {
          const projectSubdomain = projectSubdomainForSubdomain(
            appConfig.subdomain,
          );
          const gitRefFolderResult = folderNameForSubdomain(
            appConfig.subdomain,
          );

          if (gitRefFolderResult.isErr()) {
            return pushResponse({ status: "not-found" });
          }

          const gitRef = gitRefFolderResult.value;

          const projectConfig = createAppConfig({
            subdomain: projectSubdomain,
            workspaceConfig: c.var.workspaceConfig,
          });

          const projectExists = await isRunnable(projectConfig.appDir);
          if (!projectExists) {
            return pushResponse({ status: "not-found" });
          }

          const gitRefResult = await git(
            GitCommands.revParse(gitRef),
            projectConfig.appDir,
            { signal: AbortSignal.timeout(5000) },
          );

          if (gitRefResult.isErr()) {
            return pushResponse({ status: "not-found" });
          }

          c.var.parentRef.send({
            type: "workspaceServer.heartbeat",
            value: {
              appConfig,
              createdAt: Date.now(),
              shouldCreate: true,
            },
          });
          return pushResponse({ status: "loading" });
        }

        return pushResponse({ status: "not-runnable" });
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
      return pushSnapshotResponse(snapshot);
    };

    let runtimeRefSubscription: Subscription | undefined;
    let previousTags: Set<string> | undefined;

    try {
      while (!c.req.raw.signal.aborted) {
        const runtimeRef = c.var.getRuntimeRef(subdomain);

        if (runtimeRef && !runtimeRefSubscription) {
          // Ensures immediate updates without polling
          runtimeRefSubscription = runtimeRef.subscribe((snapshot) => {
            if (!previousTags || !isEqual(snapshot.tags, previousTags)) {
              previousTags = snapshot.tags;
              pushSnapshotResponse(snapshot).catch(() => {
                /* Ignore */
              });
            }
          });
        }

        try {
          await sendHeartbeat();
          await stream.sleep(500);
        } catch (error) {
          c.var.workspaceConfig.captureException(
            error instanceof Error ? error : new Error(String(error)),
            {
              scopes: ["workspace"],
            },
          );
          await pushResponse({
            errors: [
              {
                createdAt: Date.now(),
                message: "Internal server error",
                type: "runtime",
              },
            ],
            status: "error",
          });
          break;
        }
      }
    } finally {
      if (runtimeRefSubscription) {
        runtimeRefSubscription.unsubscribe();
      }
    }
  });
});

export const heartbeatRoute = app;
