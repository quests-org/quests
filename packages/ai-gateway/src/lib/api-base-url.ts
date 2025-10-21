import {
  AI_GATEWAY_API_PATH,
  type AIProviderType,
  type WorkspaceServerURL,
} from "@quests/shared";

import { OPENAI_COMPATIBLE_PATH, PROVIDERS_PATH } from "../constants";

export function apiBaseURL({
  type,
  workspaceServerURL,
}: {
  type: "openai-compatible" | AIProviderType;
  workspaceServerURL: WorkspaceServerURL;
}) {
  if (type === "openai-compatible") {
    return [
      workspaceServerURL,
      AI_GATEWAY_API_PATH,
      PROVIDERS_PATH,
      OPENAI_COMPATIBLE_PATH,
    ].join("");
  }
  return [
    workspaceServerURL,
    AI_GATEWAY_API_PATH,
    PROVIDERS_PATH,
    `/${type}`,
  ].join("");
}
