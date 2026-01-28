import { type WorkspaceServerURL } from "@quests/shared";

import { internalAPIKey } from "../lib/key-for-provider";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { getAISDKProviderInfo } from "./bundled-providers";
import { internalURL } from "./internal-url";

export function envForProviderConfig({
  config,
  workspaceServerURL,
}: {
  config: AIGatewayProviderConfig.Type;
  workspaceServerURL: WorkspaceServerURL;
}): Record<string, string> {
  const aiSDKInfo = getAISDKProviderInfo(config.type);
  const env: Record<string, string> = {
    [aiSDKInfo.envVars.apiKey]: internalAPIKey(),
    [aiSDKInfo.envVars.baseURL]: internalURL({
      config,
      workspaceServerURL,
    }),
  };

  // Google has additional legacy env vars for @google/genai
  if (config.type === "google") {
    env.GEMINI_API_KEY = internalAPIKey();
    env.GEMINI_BASE_URL = internalURL({
      config,
      workspaceServerURL,
    });
  }

  return env;
}

export function envForProviderConfigs({
  configs,
  workspaceServerURL,
}: {
  configs: AIGatewayProviderConfig.Type[];
  workspaceServerURL: WorkspaceServerURL;
}) {
  const env: Record<string, string> = {};

  for (const config of configs) {
    Object.assign(env, envForProviderConfig({ config, workspaceServerURL }));
  }

  return env;
}
