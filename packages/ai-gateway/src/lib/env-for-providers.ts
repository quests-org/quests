import { type WorkspaceServerURL } from "@quests/shared";

import { getProviderAdapter } from "../adapters/all";
import { type AIGatewayProvider } from "../schemas/provider";

export function envForProviders({
  providers,
  workspaceServerURL,
}: {
  providers: AIGatewayProvider.Type[];
  workspaceServerURL: WorkspaceServerURL;
}): Record<string, string> {
  const env: Record<string, string> = {};

  for (const provider of providers) {
    const adapter = getProviderAdapter(provider.type);
    const envForProvider = adapter.getEnv(workspaceServerURL);
    for (const [key, value] of Object.entries(envForProvider)) {
      env[key] = value;
    }
  }

  return env;
}
