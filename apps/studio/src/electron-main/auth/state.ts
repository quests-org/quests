import { logger } from "@/electron-main/lib/electron-logger";
import { type ServerType } from "@hono/node-server";

const scopedLogger = logger.scope("auth");
let authServerPort: null | number = null;
let authServer: null | ServerType = null;

export function getAuthServer() {
  return authServer;
}

export function getAuthServerPort() {
  return authServerPort;
}

export function setAuthServer(server: null | ServerType) {
  authServer = server;
}

export function setAuthServerPort(port: number) {
  authServerPort = port;
}

export function stopAuthServer() {
  if (authServer) {
    scopedLogger.info("Stopping auth callback server");
    authServer.close();
    authServer = null;
    authServerPort = null;
  }
}
