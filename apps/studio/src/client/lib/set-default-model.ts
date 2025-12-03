import { vanillaRpcClient } from "@/client/rpc/client";
import { type AIGatewayModelURI } from "@quests/ai-gateway/client";

export async function setDefaultModel(
  setSelectedModelURI: (value: AIGatewayModelURI.Type | undefined) => void,
) {
  const { models } = await vanillaRpcClient.gateway.models.list();

  let questsDefaultModel;
  let fallbackDefaultModel;

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

  const selectedModel = questsDefaultModel ?? fallbackDefaultModel;
  if (selectedModel) {
    setSelectedModelURI(selectedModel.uri);
  }
}
