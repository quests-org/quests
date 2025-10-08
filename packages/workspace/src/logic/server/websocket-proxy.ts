import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";

import { type ServerType } from "@hono/node-server";
import invariant from "tiny-invariant";
import { WebSocket, WebSocketServer } from "ws";

import { SHIM_IFRAME_BASE_PATH } from "./constants";
import { type WorkspaceServerParentRef } from "./types";
import { uriDetailsForHost } from "./uri-details-for-host";

export function setupWebSocketProxy(
  server: ServerType,
  parentRef: WorkspaceServerParentRef,
) {
  server.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (req.url?.startsWith(SHIM_IFRAME_BASE_PATH)) {
      socket.destroy();
      return;
    }

    const host = req.headers.host || "";
    const uriDetails = uriDetailsForHost(host);

    if (uriDetails.isErr()) {
      socket.destroy();
      return;
    }

    const { subdomain } = uriDetails.value;
    const snapshot = parentRef.getSnapshot();
    invariant(snapshot, "Workspace not found");
    const runtimeRef = snapshot.context.runtimeRefs.get(subdomain);

    if (!runtimeRef) {
      socket.destroy();
      return;
    }

    const runtimePort = runtimeRef.getSnapshot().context.port;
    if (!runtimePort) {
      socket.destroy();
      return;
    }

    const targetUrl = `ws://localhost:${runtimePort}${req.url ?? ""}`;
    const subprotocols = req.headers["sec-websocket-protocol"];

    const ws = new WebSocket(
      targetUrl,
      subprotocols ? subprotocols.split(", ") : [],
      {
        headers: {
          ...req.headers,
          "X-Forwarded-For":
            req.headers["x-forwarded-for"] ||
            req.headers["x-real-ip"] ||
            "127.0.0.1",
          "X-Forwarded-Host": host,
        },
      },
    );

    let clientWs: null | WebSocket = null;

    ws.on("open", () => {
      const wss = new WebSocketServer({ noServer: true });
      wss.handleUpgrade(req, socket, head, (client) => {
        clientWs = client;

        clientWs.on("message", (message, isBinary) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(message, { binary: isBinary });
          }
        });

        clientWs.on("close", () => {
          ws.close();
        });

        clientWs.on("error", () => {
          ws.close();
        });

        ws.on("message", (message, isBinary) => {
          if (clientWs?.readyState === WebSocket.OPEN) {
            clientWs.send(message, { binary: isBinary });
          }
        });

        ws.on("close", () => {
          clientWs?.close();
        });

        ws.on("error", () => {
          clientWs?.close();
        });
      });
    });

    ws.on("error", (error) => {
      runtimeRef.send({
        type: "appendError",
        value: {
          error: error instanceof Error ? error : new Error("Unknown error"),
        },
      });
      if (clientWs) {
        clientWs.close();
      } else {
        socket.destroy();
      }
    });
  });
}
