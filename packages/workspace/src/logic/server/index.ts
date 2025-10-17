import { serve, type ServerType } from "@hono/node-server";
import { type AIGatewayApp, type AIGatewayEnv } from "@quests/ai-gateway";
import { AI_GATEWAY_API_PATH } from "@quests/shared";
import { Hono } from "hono";
import invariant from "tiny-invariant";
import { type ActorRefFrom, type AnyEventObject, fromCallback } from "xstate";

import { type AbsolutePath } from "../../schemas/paths";
import { type AppSubdomain } from "../../schemas/subdomains";
import { type WorkspaceConfig } from "../../types";
import { DEFAULT_APPS_SERVER_PORT } from "./constants";
import { allProxyRoute } from "./routes/all-proxy";
import { heartbeatRoute } from "./routes/heartbeat";
import { redirectRoute } from "./routes/redirect";
import { shimIFrameRoute } from "./routes/shim-iframe";
import { shimScriptRoute } from "./routes/shim-script";
import {
  type WorkspaceServerEnv,
  type WorkspaceServerParentRef,
} from "./types";
import { generateWorkspaceServerPort } from "./url";
import { setupWebSocketProxy } from "./websocket-proxy";

export const workspaceServerLogic = fromCallback<
  AnyEventObject,
  {
    aiGatewayApp?: AIGatewayApp;
    parentRef: WorkspaceServerParentRef;
    shimClientDir: "dev-server" | AbsolutePath;
    workspaceConfig: WorkspaceConfig;
  }
>(({ input }) => {
  const app = new Hono<WorkspaceServerEnv>();

  app.use(async (c, next) => {
    function getRuntimeRef(subdomain: AppSubdomain) {
      const snapshot = input.parentRef.getSnapshot();
      invariant(snapshot, "Workspace not found");
      return snapshot.context.runtimeRefs.get(subdomain);
    }
    c.set("parentRef", input.parentRef);
    c.set("workspaceConfig", input.workspaceConfig);
    c.set("getRuntimeRef", getRuntimeRef);
    c.set("shimClientDir", input.shimClientDir);
    await next();
  });

  app.route("/", shimScriptRoute);
  app.route("/", shimIFrameRoute);
  app.route("/", heartbeatRoute);
  app.route("/", redirectRoute);
  // Note: Must be after all app-specific routes
  app.route("/", allProxyRoute);
  if (input.aiGatewayApp) {
    app.use<string, AIGatewayEnv>(
      `${AI_GATEWAY_API_PATH}/*`,
      async (c, next) => {
        c.set(
          "getAIProviderConfigs",
          input.workspaceConfig.getAIProviderConfigs,
        );
        c.set("captureException", input.workspaceConfig.captureException);
        await next();
      },
    );
    app.route("/", input.aiGatewayApp);
  }

  let server: null | ServerType = null;

  void generateWorkspaceServerPort()
    .then((port) => {
      if (port !== DEFAULT_APPS_SERVER_PORT) {
        input.workspaceConfig.captureEvent("workspace.non_default_port", {
          apps_server_port: port,
        });
      }
      server = serve({ fetch: app.fetch, port });

      setupWebSocketProxy(server, input.parentRef);

      input.parentRef.send({
        type: "workspaceServer.started",
        value: { port },
      });
    })
    .catch(() => {
      input.parentRef.send({
        type: "workspaceServer.error",
        value: { error: new Error("Failed to generate workspace server port") },
      });
    });

  return () => {
    if (server) {
      server.close();
    }
  };
});

export type WorkspaceServerActorRef = ActorRefFrom<typeof workspaceServerLogic>;
