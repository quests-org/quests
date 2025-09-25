import { type AIGatewayApp, type AIGatewayEnv } from "@quests/ai-gateway";
import { AI_GATEWAY_API_PATH } from "@quests/shared";
import { type ExecutionContext, Hono } from "hono";
import invariant from "tiny-invariant";
import { type ActorRefFrom, type AnyEventObject, fromCallback } from "xstate";

import { type AbsolutePath } from "../../schemas/paths";
import { type AppSubdomain } from "../../schemas/subdomains";
import { type WorkspaceConfig } from "../../types";
import { DEFAULT_APPS_SERVER_PORT } from "./constants";
import { allProxyRoute } from "./routes/all-proxy";
import { heartbeatRoute } from "./routes/heartbeat";
import { shimIFrameRoute } from "./routes/shim-iframe";
import { shimScriptRoute } from "./routes/shim-script";
import {
  type WorkspaceServerEnv,
  type WorkspaceServerParentRef,
} from "./types";
import { generateWorkspaceServerPort } from "./url";

type Serve = (options: ServerOptions) => {
  close: () => void;
};

interface ServerOptions {
  fetch: (
    request: Request,
    Env?: object,
    executionCtx?: ExecutionContext,
  ) => Promise<Response> | Response;
  port: number;
}

export const workspaceServerLogic = fromCallback<
  AnyEventObject,
  {
    aiGatewayApp?: AIGatewayApp;
    parentRef: WorkspaceServerParentRef;
    serve: Serve;
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
  // Note: Must be after all app-specific routes
  app.route("/", allProxyRoute);
  if (input.aiGatewayApp) {
    app.use<string, AIGatewayEnv>(
      `${AI_GATEWAY_API_PATH}/*`,
      async (c, next) => {
        c.set("getAIProviders", input.workspaceConfig.getAIProviders);
        c.set("captureException", input.workspaceConfig.captureException);
        await next();
      },
    );
    app.route("/", input.aiGatewayApp);
  }

  let server: null | { close: () => void } = null;

  void generateWorkspaceServerPort()
    .then((port) => {
      if (port !== DEFAULT_APPS_SERVER_PORT) {
        input.workspaceConfig.captureException(
          new Error("Workspace server port is not the default port"),
          {
            apps_server_port: port,
            scopes: ["workspace"],
          },
        );
      }
      server = input.serve({ fetch: app.fetch, port });

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
