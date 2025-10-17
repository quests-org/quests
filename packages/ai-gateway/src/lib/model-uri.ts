import { Result } from "typescript-result";

import { AIGatewayModel } from "../schemas/model";
import { TypedError } from "./errors";

export function modelToURI(
  model: Pick<AIGatewayModel.Type, "author" | "canonicalId" | "params">,
): AIGatewayModel.URI {
  const { author, canonicalId, params } = model;
  const baseUri = `${author}/${canonicalId}`;

  const queryParams = new URLSearchParams(params);
  return AIGatewayModel.URISchema.parse(`${baseUri}?${queryParams.toString()}`);
}

export function parseModelURI(uri: string) {
  const [pathPart, queryPart] = uri.split("?");

  if (!pathPart || !queryPart) {
    return Result.error(new TypedError.Parse(`Invalid model URI: ${uri}`));
  }

  const [author, canonicalId] = pathPart.split("/");

  if (!author || !canonicalId) {
    return Result.error(new TypedError.Parse(`Invalid model URI: ${uri}`));
  }

  const queryParams = new URLSearchParams(queryPart);
  const paramsObject = Object.fromEntries(queryParams.entries());
  const paramsResult = AIGatewayModel.ParamsSchema.safeParse(paramsObject);

  if (!paramsResult.success) {
    return Result.error(
      new TypedError.Parse(`Invalid parameters for model URI: ${uri}`, {
        cause: paramsResult.error,
      }),
    );
  }

  return Result.ok({
    author,
    canonicalId,
    params: paramsResult.data,
  });
}
