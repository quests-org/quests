import { AIProviderTypeSchema } from "@quests/shared";
import { Result } from "typescript-result";

import { TypedError } from "./errors";

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
  const providerString = queryParams.get("provider") ?? "missing";

  const providerResult = AIProviderTypeSchema.safeParse(providerString);

  if (!providerResult.success) {
    return Result.error(
      new TypedError.Parse(`Invalid provider: ${providerString}`),
    );
  }

  return Result.ok({
    author,
    canonicalId,
    provider: providerResult.data,
  });
}
