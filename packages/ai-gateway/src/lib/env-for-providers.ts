import { type WorkspaceServerURL } from "@quests/shared";

import { getProviderAdapter } from "../adapters/all";
import { DEFAULT_OPENAI_MODEL } from "../constants";
import { type AIGatewayProvider } from "../schemas/provider";

export function envForProviders({
  providers,
  workspaceServerURL,
}: {
  providers: AIGatewayProvider.Type[];
  workspaceServerURL: WorkspaceServerURL;
}) {
  const env: Record<string, string> = {};

  for (const provider of providers) {
    const adapter = getProviderAdapter(provider.type);
    const envForProvider = adapter.getEnv(workspaceServerURL);
    if (adapter.features.includes("openai/chat-completions")) {
      env.OPENAI_DEFAULT_MODEL = DEFAULT_OPENAI_MODEL;
    }
    for (const [key, value] of Object.entries(envForProvider)) {
      env[key] = value;
    }
  }

  return env;
}
