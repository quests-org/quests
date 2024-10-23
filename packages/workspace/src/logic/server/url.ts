import { type WorkspaceServerURL } from "@quests/shared";
import { detect } from "detect-port";

import {
  DEFAULT_APPS_SERVER_PORT,
  LOCALHOST_APPS_SERVER_DOMAIN,
} from "./constants";

let LAST_PORT: number = DEFAULT_APPS_SERVER_PORT;

export async function generateWorkspaceServerPort() {
  const generatedPort = await detect(DEFAULT_APPS_SERVER_PORT);
  LAST_PORT = generatedPort;
  return LAST_PORT;
}

export function getWorkspaceServerPort() {
  return LAST_PORT;
}

export function getWorkspaceServerURL() {
  return `http://${LOCALHOST_APPS_SERVER_DOMAIN}:${getWorkspaceServerPort()}` as WorkspaceServerURL;
}
