import { Result } from "typescript-result";
import { z } from "zod";

import { AIGatewayModel } from "../../schemas/model";
import { AIGatewayModelURI } from "../../schemas/model-uri";
import { type AIGatewayProviderConfig } from "../../schemas/provider-config";
import { addHeuristicTags } from "../add-heuristic-tags";
import { TypedError } from "../errors";
import { fetchJson } from "../fetch-json";
import { generateModelName } from "../generate-model-name";
import { getModelFeatures } from "../get-model-features";
import { isModelNew } from "../is-model-new";
import { apiURL } from "../providers/api-url";
import { getProviderMetadata } from "../providers/metadata";
import { setProviderAuthHeaders } from "../providers/set-auth-headers";

const ModelSchema = z.object({
  created: z.number().optional(),
  id: z.string(),
  object: z.string().optional(),
  owned_by: z.string().optional(),
});

type MinimalProviderConfig = Pick<
  AIGatewayProviderConfig.Type,
  "apiKey" | "baseURL" | "type"
>;

export function fetchAndParseOpenAIModels(
  config: AIGatewayProviderConfig.Type,
) {
  return Result.gen(function* () {
    const data = yield* fetchOpenAIModels(config);

    const modelsResult = yield* Result.try(
      () => z.object({ data: z.array(ModelSchema) }).parse(data),
      (error) =>
        new TypedError.Parse(`Failed to validate models from ${config.type}`, {
          cause: error,
        }),
    );

    const metadata = getProviderMetadata(config.type);

    return modelsResult.data.map((model) => {
      const providerId = AIGatewayModel.ProviderIdSchema.parse(model.id);
      const canonicalId = AIGatewayModel.CanonicalIdSchema.parse(providerId);
      const author = "openai";
      const modelName = generateModelName(canonicalId);

      const features = getModelFeatures(canonicalId);
      const tags: AIGatewayModel.ModelTag[] = [];
      const isNew = isModelNew(model.created);
      if (isNew) {
        tags.push("new");
      }
      const params = {
        provider: config.type,
        providerConfigId: config.id,
      };

      return addHeuristicTags(
        {
          author,
          canonicalId,
          features,
          name: modelName,
          params,
          providerId,
          providerName: config.displayName ?? metadata.name,
          tags,
          uri: AIGatewayModelURI.fromModel({
            author,
            canonicalId,
            params,
          }),
        },
        config,
      );
    });
  });
}

export function fetchOpenAIModels(
  config: MinimalProviderConfig,
  { cache = true }: { cache?: boolean } = {},
) {
  const headers = new Headers({ "Content-Type": "application/json" });
  setProviderAuthHeaders(headers, config);

  return fetchJson({
    cache,
    headers,
    url: apiURL({ config, path: "/models" }),
  });
}
