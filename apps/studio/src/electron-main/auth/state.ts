import { type ServerType } from "@hono/node-server";

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
