import {
  type CaptureExceptionFunction,
  type WorkspaceServerURL,
} from "@quests/shared";

import { getProviderAdapter } from "../adapters/all";
import { type AIGatewayModel } from "../schemas/model";
import { type AIGatewayProvider } from "../schemas/provider";
import { sortModelsByRecommended } from "./sort-models-by-recommended";

export async function envForProviders({
  captureException,
  providers,
  workspaceServerURL,
}: {
  captureException: CaptureExceptionFunction;
  providers: AIGatewayProvider.Type[];
  workspaceServerURL: WorkspaceServerURL;
}): Promise<Record<string, string>> {
  const env: Record<string, string> = {};

  let openaiDefaultModel: AIGatewayModel.Type | undefined;

  for (const provider of providers) {
    const adapter = getProviderAdapter(provider.type);
    const envForProvider = adapter.getEnv(workspaceServerURL);
    if (
      !openaiDefaultModel &&
      adapter.features.includes("openai/chat-completions")
    ) {
      const models = await adapter.fetchModels(provider, {
        captureException,
      });
      const sortedModels = sortModelsByRecommended(models.getOrDefault([]));
      openaiDefaultModel = sortedModels[0];
    }
    for (const [key, value] of Object.entries(envForProvider)) {
      env[key] = value;
    }
  }

  if (openaiDefaultModel) {
    env.OPENAI_DEFAULT_MODEL = openaiDefaultModel.canonicalId;
  }

  return env;
}
