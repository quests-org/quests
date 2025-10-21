import { AI_GATEWAY_API_PATH, type WorkspaceServerURL } from "@quests/shared";

import { PROVIDERS_PATH } from "../constants";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";

export function internalURL({
  config,
  workspaceServerURL,
}: {
  config: AIGatewayProviderConfig.Type;
  workspaceServerURL: WorkspaceServerURL;
}) {
  return [
    workspaceServerURL,
    AI_GATEWAY_API_PATH,
    PROVIDERS_PATH,
    `/${config.id}`,
  ].join("");
}
