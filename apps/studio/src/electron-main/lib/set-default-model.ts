import {
  getDefaultModelURI,
  setDefaultModelURI,
} from "@/electron-main/stores/preferences";
import {
  type AIGatewayModel,
  fetchModelResultsForProviders,
} from "@quests/ai-gateway";

import { captureServerException } from "./capture-server-exception";
import { getAIProviderConfigs } from "./get-ai-provider-configs";

export async function setDefaultModelIfNeeded(options?: {
  forceUpdateForNewLogin?: boolean;
}): Promise<void> {
  const existingDefault = getDefaultModelURI();
  if (existingDefault && !options?.forceUpdateForNewLogin) {
    return;
  }

  const providers = getAIProviderConfigs();

  if (providers.length === 0) {
    return;
  }

  const modelsForProviders = await fetchModelResultsForProviders(providers, {
    captureException: captureServerException,
  });

  const models: AIGatewayModel.Type[] = [];
  for (const modelResults of modelsForProviders) {
    if (modelResults.ok) {
      models.push(...modelResults.value);
    }
  }

  let questsDefaultModel: AIGatewayModel.Type | undefined;
  let fallbackDefaultModel: AIGatewayModel.Type | undefined;

  for (const model of models) {
    if (!model.tags.includes("default")) {
      continue;
    }

    if (model.params.provider === "quests") {
      questsDefaultModel = model;
      break;
    }
    fallbackDefaultModel ??= model;
  }

  // Prefer the Quests default model if it exists, otherwise use the fallback
  const selectedModel = questsDefaultModel ?? fallbackDefaultModel;
  if (selectedModel) {
    setDefaultModelURI(selectedModel.uri);
  }
}
