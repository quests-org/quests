let authServerPort: null | number = null;

export function getAuthServerPort() {
  return authServerPort;
}

export function setAuthServerPort(port: number) {
  authServerPort = port;
}
