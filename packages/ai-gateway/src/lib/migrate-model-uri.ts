import { AIProviderTypeSchema } from "@quests/shared";
import { Result } from "typescript-result";

import { TypedError } from "../lib/errors";
import { AIGatewayModelURI } from "../schemas/model-uri";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";

export function migrateModelURI({
  configs,
  modelURI,
}: {
  configs: AIGatewayProviderConfig.Type[];
  modelURI: string;
}) {
  const parseResult = AIGatewayModelURI.Schema.safeParse(modelURI);

  // Already a valid URI
  if (parseResult.success) {
    return Result.ok(parseResult.data);
  }

  const partsResult = AIGatewayModelURI.parseURIParts(modelURI);
  if (!partsResult.ok) {
    return partsResult;
  }

  const { author, canonicalId, queryPart } = partsResult.value;

  const queryParams = new URLSearchParams(queryPart);
  const paramEntries = [...queryParams.keys()];
  const providerTypeResult = AIProviderTypeSchema.safeParse(
    queryParams.get("provider"),
  );

  // 2025-10-18 Migrates old model URIs to the new format
  // Remove after 1 month
  if (
    paramEntries.length !== 1 ||
    paramEntries[0] !== "provider" ||
    !providerTypeResult.success
  ) {
    return Result.error(
      new TypedError.Parse(
        `Can only migrate model URIs with a single "provider" parameter. Model URI: ${modelURI}`,
      ),
    );
  }
  const providerType = providerTypeResult.data;

  // Find a provider for this model URI
  const config = configs.find((c) => c.type === providerType);
  if (!config) {
    return Result.error(
      new TypedError.NotFound(`Provider config for ${providerType} not found`),
    );
  }

  // Construct the URI using the provider config
  return Result.ok(
    AIGatewayModelURI.fromModel({
      author,
      canonicalId: AIGatewayModelURI.CanonicalIdSchema.parse(canonicalId),
      params: {
        provider: config.type,
        providerConfigId: config.id,
      },
    }),
  );
}
