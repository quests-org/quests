import { AIGatewayModel } from "../schemas/model";

export function modelToURI(
  model: Pick<AIGatewayModel.Type, "author" | "canonicalId" | "params">,
): AIGatewayModel.URI {
  const { author, canonicalId, params } = model;
  const baseUri = `${author}/${canonicalId}`;

  const queryParams = new URLSearchParams(params);
  return AIGatewayModel.URISchema.parse(`${baseUri}?${queryParams.toString()}`);
}
