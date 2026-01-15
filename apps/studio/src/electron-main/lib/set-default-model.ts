import {
  getDefaultModelURI,
  setDefaultModelURI,
} from "@/electron-main/stores/preferences";
import {
  type AIGatewayModel,
  fetchModelResultsForProviders,
} from "@quests/ai-gateway";
import { QUESTS_AUTO_MODEL_PROVIDER_ID } from "@quests/shared";

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

  const defaultModels = models.filter((model) =>
    model.tags.includes("default"),
  );

  // 1. Quests auto model (quests/auto)
  // 2. Quests authored model (quests/*)
  // 3. Quests provider model (any/model?provider=quests)
  // 4. First default model
  const selectedModel =
    defaultModels.find((m) => m.providerId === QUESTS_AUTO_MODEL_PROVIDER_ID) ??
    defaultModels.find((m) => m.author === "quests") ??
    defaultModels.find((m) => m.params.provider === "quests") ??
    defaultModels[0];

  if (selectedModel) {
    setDefaultModelURI(selectedModel.uri);
  }
}
