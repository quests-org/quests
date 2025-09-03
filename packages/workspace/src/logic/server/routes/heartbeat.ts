import { APPS_SERVER_API_PATH } from "@quests/shared";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { isEqual } from "radashi";

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
    const sendStatus = async (
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

                  await sendStatus({ status: "loading" });
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
          return sendStatus({ status: "loading" });
        }

        if (appConfig.type === "preview") {
          const doesAppExist = await registryAppExists({
            folderName: appConfig.folderName,
            workspaceConfig: c.var.workspaceConfig,
          });
          if (!doesAppExist) {
            return sendStatus({ status: "not-found" });
          }
          c.var.parentRef.send({
            type: "workspaceServer.heartbeat",
            value: {
              appConfig,
              createdAt: Date.now(),
              shouldCreate: true,
            },
          });
          return sendStatus({ status: "loading" });
        }

        if (appConfig.type === "version") {
          const projectSubdomain = projectSubdomainForSubdomain(
            appConfig.subdomain,
          );
          const gitRefFolderResult = folderNameForSubdomain(
            appConfig.subdomain,
          );

          if (gitRefFolderResult.isErr()) {
            return sendStatus({ status: "not-found" });
          }

          const gitRef = gitRefFolderResult.value;

          const projectConfig = createAppConfig({
            subdomain: projectSubdomain,
            workspaceConfig: c.var.workspaceConfig,
          });

          const projectExists = await isRunnable(projectConfig.appDir);
          if (!projectExists) {
            return sendStatus({ status: "not-found" });
          }

          const gitRefResult = await git(
            GitCommands.revParse(gitRef),
            projectConfig.appDir,
            { signal: AbortSignal.timeout(5000) },
          );

          if (gitRefResult.isErr()) {
            return sendStatus({ status: "not-found" });
          }

          c.var.parentRef.send({
            type: "workspaceServer.heartbeat",
            value: {
              appConfig,
              createdAt: Date.now(),
              shouldCreate: true,
            },
          });
          return sendStatus({ status: "loading" });
        }

        return sendStatus({ status: "not-runnable" });
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
      const tags = snapshot.tags as Set<AppStatus>;
      const firstTag = tags.values().next().value ?? "unknown";

      return sendStatus({ errors: snapshot.context.errors, status: firstTag });
    };

    while (true) {
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
        await sendStatus({
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
  });
});

export const heartbeatRoute = app;
