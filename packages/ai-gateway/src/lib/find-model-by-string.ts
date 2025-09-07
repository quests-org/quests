import { DEFAULT_OPENAI_MODEL } from "../constants";
import { type AIGatewayModel } from "../schemas/model";
import { sortModelsByRecommended } from "./sort-models-by-recommended";

export function findModelByString(
  id: string,
  models: AIGatewayModel.Type[],
): { exact: boolean; model: AIGatewayModel.Type | undefined } {
  if (id === DEFAULT_OPENAI_MODEL) {
    const sortedModels = sortModelsByRecommended(models);
    const firstOpenAIModel = sortedModels.find((m) => m.author === "openai");
    return {
      exact: false,
      model: firstOpenAIModel ?? sortedModels[0],
    };
  }

  const uriMatch = models.find((m) => m.uri === id);
  const canonicalIdMatch = models.find((m) => m.canonicalId === id);
  const providerIdMatch = models.find((m) => m.providerId === id);
  return {
    exact: uriMatch?.uri === id,
    model: uriMatch ?? canonicalIdMatch ?? providerIdMatch,
  };
}
