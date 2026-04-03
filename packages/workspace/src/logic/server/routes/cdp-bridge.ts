import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";

import { type ServerType } from "@hono/node-server";
import { Hono } from "hono";
import { WebSocket, WebSocketServer } from "ws";

import { type ProjectSubdomain } from "../../../schemas/subdomains";
import { type WorkspaceConfig } from "../../../types";
import { type WorkspaceServerEnv } from "../types";
import { getWorkspaceServerPort } from "../url";

const CDP_BASE_PATH = "/_quests/cdp";
export const CDP_PAGE_PATH_PREFIX = `${CDP_BASE_PATH}/devtools/page/`;

export const cdpBridgeRoute = new Hono<WorkspaceServerEnv>();

cdpBridgeRoute.get(`${CDP_BASE_PATH}/json/version`, (c) => {
  const port = getWorkspaceServerPort();
  return c.json({
    Browser: "Electron/Chromium",
    "Protocol-Version": "1.3",
    "User-Agent": "Electron",
    "V8-Version": process.versions.v8,
    "WebKit-Version": "",
    webSocketDebuggerUrl: `ws://127.0.0.1:${port}${CDP_BASE_PATH}/devtools/browser`,
  });
});

cdpBridgeRoute.get(`${CDP_BASE_PATH}/json`, async (c) => {
  const subdomain = c.req.query("subdomain") as ProjectSubdomain | undefined;
  if (!subdomain) {
    return c.json({ error: "subdomain query parameter required" }, 400);
  }

  const { browser } = c.get("workspaceConfig");
  const port = getWorkspaceServerPort();
  const targets = await browser.listTargets(subdomain);

  return c.json(
    targets.map((t) => ({
      description: "",
      devtoolsFrontendUrl: "",
      id: t.id,
      title: t.title,
      type: t.type,
      url: t.url,
      webSocketDebuggerUrl: `ws://127.0.0.1:${port}${CDP_PAGE_PATH_PREFIX}${t.id}`,
    })),
  );
});

export function setupCdpWebSocketBridge(
  server: ServerType,
  workspaceConfig: WorkspaceConfig,
) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (!req.url?.startsWith(CDP_PAGE_PATH_PREFIX)) {
      return;
    }

    const targetId = req.url.slice(CDP_PAGE_PATH_PREFIX.length).split("?")[0];
    if (!targetId) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (clientWs) => {
      handleCdpClient(clientWs, targetId, workspaceConfig);
    });
  });
}

// Commands that operate on the browser-level target tree. We intercept these
// and return synthetic responses scoped to just the single WebContentsView
// target so agent-browser doesn't discover or attach to unrelated Electron
// targets (the Studio renderer, DevTools windows, etc.).
const INTERCEPTED_TARGET_COMMANDS = new Set([
  "Target.activateTarget",
  "Target.attachToTarget",
  "Target.closeTarget",
  "Target.createBrowserContext",
  "Target.createTarget",
  "Target.disposeBrowserContext",
  "Target.getTargets",
  "Target.setDiscoverTargets",
]);

function handleCdpClient(
  clientWs: WebSocket,
  targetId: string,
  workspaceConfig: WorkspaceConfig,
) {
  let unsubscribe: (() => void) | null = null;
  let currentLoaderId = "";

  const send = (payload: unknown) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify(payload));
    }
  };

  const onDetach = () => {
    clientWs.close(1001, "Target detached");
  };

  const sendLifecycleEvent = (frameId: string, name: string) => {
    send({
      method: "Page.lifecycleEvent",
      params: {
        frameId,
        loaderId: currentLoaderId,
        name,
        timestamp: Date.now() / 1000,
      },
      sessionId: `session-${targetId}`,
    });
  };

  const onEvent = (method: string, params: unknown) => {
    console.log(
      `[CDP] <-- targetId=${targetId} event=${method} params=${JSON.stringify(params)}`,
    );
    // Inject the synthetic sessionId so agent-browser can match events to the
    // session it attached to via Target.attachToTarget. Electron emits events
    // without a sessionId since the debugger is browser-level, but agent-browser
    // filters events by sessionId when waiting for Page.loadEventFired etc.
    send({ method, params, sessionId: `session-${targetId}` });

    // Track the loaderId from navigation events so lifecycle events carry the
    // correct loaderId that agent-browser uses to match them to the navigation.
    if (method === "Page.frameStartedNavigating") {
      const p = params as { loaderId?: string };
      currentLoaderId = p.loaderId ?? "";
    }

    // Electron doesn't emit Page.lifecycleEvent, which agent-browser waits for
    // after navigation (specifically "networkIdle"). Synthesize the full
    // sequence after Page.frameStoppedLoading so the open command resolves.
    if (method === "Page.frameStoppedLoading") {
      const { frameId } = params as { frameId?: string };
      if (frameId) {
        sendLifecycleEvent(frameId, "DOMContentLoaded");
        sendLifecycleEvent(frameId, "load");
        sendLifecycleEvent(frameId, "networkAlmostIdle");
        sendLifecycleEvent(frameId, "networkIdle");
      }
    }
  };

  unsubscribe = workspaceConfig.browser.subscribeEvents(
    targetId,
    onDetach,
    onEvent,
  );

  clientWs.on("message", (data) => {
    let message: {
      id?: number;
      method?: string;
      params?: unknown;
      sessionId?: string;
    };
    try {
      const raw = Buffer.isBuffer(data)
        ? data.toString("utf8")
        : Array.isArray(data)
          ? Buffer.concat(data).toString("utf8")
          : Buffer.from(data).toString("utf8");
      message = JSON.parse(raw) as typeof message;
    } catch {
      return;
    }

    const { id, method, params, sessionId } = message;
    if (typeof method !== "string") {
      return;
    }

    console.log(
      `[CDP] --> targetId=${targetId} method=${method} sessionId=${sessionId ?? "none"} params=${JSON.stringify(params)}`,
    );

    // Intercept Target.* commands that would otherwise leak all Electron
    // targets through the browser-level debugger.
    if (INTERCEPTED_TARGET_COMMANDS.has(method)) {
      handleInterceptedTargetCommand(
        clientWs,
        id,
        method,
        params,
        targetId,
        workspaceConfig,
      );
      return;
    }

    // sessionId is present when agent-browser uses flat session mode after
    // Target.attachToTarget. We issued a synthetic sessionId so we just strip
    // it and forward the command directly to the target's debugger.
    workspaceConfig.browser
      .sendCommand(targetId, method, params ?? {})
      .then((result) => {
        send({ id, result });
      })
      .catch((error: unknown) => {
        send({
          error: {
            code: -32_000,
            message: error instanceof Error ? error.message : "Command failed",
          },
          id,
        });
      });
  });

  clientWs.on("close", () => {
    unsubscribe?.();
    unsubscribe = null;
  });

  clientWs.on("error", () => {
    unsubscribe?.();
    unsubscribe = null;
  });
}

function handleInterceptedTargetCommand(
  clientWs: WebSocket,
  id: number | undefined,
  method: string,
  params: unknown,
  targetId: string,
  workspaceConfig: WorkspaceConfig,
) {
  const send = (payload: unknown) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify(payload));
    }
  };

  switch (method) {
    case "Target.activateTarget":
    case "Target.closeTarget": {
      // Silently succeed; lifecycle is managed by BrowserViewManager.
      send({ id, result: {} });
      return;
    }

    case "Target.attachToTarget": {
      const p = params as undefined | { targetId?: string };
      const requestedId = p?.targetId;
      // Only allow attaching to the target this connection owns.
      if (requestedId && requestedId !== targetId) {
        send({
          error: {
            code: -32_000,
            message: `Target ${requestedId} is not accessible from this connection`,
          },
          id,
        });
        return;
      }
      // The WebContentsView debugger is already attached at the browser level;
      // Electron doesn't support Target.attachToTarget with our integer-based
      // targetId. Return a synthetic sessionId - commands sent with this
      // sessionId are stripped of it and forwarded directly to the debugger.
      send({ id, result: { sessionId: `session-${targetId}` } });
      return;
    }
    case "Target.createBrowserContext":
    case "Target.disposeBrowserContext": {
      // Electron doesn't support CDP browser context management. Return a
      // synthetic context ID so agent-browser's recording flow can proceed.
      // Download behavior is handled via Browser.setDownloadBehavior interception
      // in BrowserViewManager.
      send({ id, result: { browserContextId: `context-${targetId}` } });
      return;
    }

    case "Target.createTarget": {
      // agent-browser may try to open a new tab; redirect it to the existing
      // target rather than creating one (which is not supported on a
      // WebContentsView debugger). If a URL was requested, navigate to it.
      const cp = params as undefined | { url?: string };
      const url = cp?.url;
      if (url && url !== "about:blank") {
        workspaceConfig.browser
          .sendCommand(targetId, "Page.navigate", { url })
          .then(() => {
            send({ id, result: { targetId } });
          })
          .catch(() => {
            send({ id, result: { targetId } });
          });
      } else {
        send({ id, result: { targetId } });
      }
      return;
    }

    case "Target.getTargets": {
      // Return a synthetic single-target list scoped to just this view.
      // The underlying Target.getTargets leaks all Electron targets because
      // the WebContentsView debugger is browser-level.
      send({
        id,
        result: {
          targetInfos: [
            {
              attached: true,
              canAccessOpener: false,
              targetId,
              title: "",
              type: "page",
              url: "",
            },
          ],
        },
      });
      return;
    }

    case "Target.setDiscoverTargets": {
      // Acknowledge but do nothing; we don't emit Target.targetCreated events.
      send({ id, result: {} });
      return;
    }

    default: {
      send({ error: { code: -32_601, message: "Method not found" }, id });
    }
  }
}
