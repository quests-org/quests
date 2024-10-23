import { type AIGatewayModel } from "../schemas/model";

export function findModelByString(
  id: string,
  models: AIGatewayModel.Type[],
): { exact: boolean; model: AIGatewayModel.Type | undefined } {
  const uriMatch = models.find((m) => m.uri === id);
  const canonicalIdMatch = models.find((m) => m.canonicalId === id);
  const providerIdMatch = models.find((m) => m.providerId === id);
  return {
    exact: uriMatch?.uri === id,
    model: uriMatch ?? canonicalIdMatch ?? providerIdMatch,
  };
}
