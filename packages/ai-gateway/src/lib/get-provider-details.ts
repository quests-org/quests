import {
  type CaptureExceptionFunction,
  type WorkspaceServerURL,
} from "@quests/shared";
import { parallel } from "radashi";

import { type AIGatewayModel } from "../schemas/model";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { getPackageForProviderType } from "./bundled-providers";
import { envForProviderConfig } from "./env-for-provider-configs";
import { fetchModelsForProvider } from "./fetch-models";
import { getProviderMetadata } from "./providers/metadata";

export async function getProviderDetails({
  captureException,
  configs,
  workspaceServerURL,
}: {
  captureException: CaptureExceptionFunction;
  configs: AIGatewayProviderConfig.Type[];
  workspaceServerURL: WorkspaceServerURL;
}) {
  const modelResultsByProvider = await parallel(10, configs, (config) =>
    fetchModelsForProvider(config, { captureException }),
  );

  const providerDetails = configs.map((config, index) => {
    const modelResult = modelResultsByProvider[index];
    return { config, modelResult };
  });

  return providerDetails.map(({ config, modelResult }) => {
    const models = modelResult?.ok ? modelResult.value : [];

    const recommendedModelId = selectRecommendedModel(models);

    const envVariables = envForProviderConfig({
      config,
      workspaceServerURL,
    });

    const metadata = getProviderMetadata(config.type);
    const aiSDKPackage = getPackageForProviderType(config.type);

    return {
      aiSDKPackage,
      config,
      envVariables,
      metadata,
      recommendedModelId,
    };
  });
}

function selectRecommendedModel(models: AIGatewayModel.Type[]) {
  const defaultModel = models.find((model) => model.tags.includes("default"));

  if (defaultModel) {
    return defaultModel.providerId;
  }

  const recommendedModel = models.find((model) =>
    model.tags.includes("recommended"),
  );

  return recommendedModel?.providerId;
}
