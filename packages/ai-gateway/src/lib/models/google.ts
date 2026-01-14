import { Result } from "typescript-result";
import { z } from "zod";

import { AIGatewayModel } from "../../schemas/model";
import { AIGatewayModelURI } from "../../schemas/model-uri";
import { type AIGatewayProviderConfig } from "../../schemas/provider-config";
import { TypedError } from "../errors";
import { fetchJson } from "../fetch-json";
import { getModelFeatures } from "../get-model-features";
import { getModelTags } from "../get-model-tags";
import { apiURL } from "../providers/api-url";
import { getProviderMetadata } from "../providers/metadata";
import { setProviderAuthHeaders } from "../providers/set-auth-headers";

const ModelSchema = z.object({
  description: z.string().optional(),
  displayName: z.string(),
  inputTokenLimit: z.number(),
  maxTemperature: z.number().optional(),
  name: z.string(),
  outputTokenLimit: z.number(),
  supportedGenerationMethods: z.array(z.string()),
  temperature: z.number().optional(),
  thinking: z.boolean().optional(),
  topK: z.number().optional(),
  topP: z.number().optional(),
  version: z.string(),
});

const GoogleModelsResponseSchema = z.object({
  models: z.array(ModelSchema),
  nextPageToken: z.string().optional(),
});

type MinimalProviderConfig = Pick<
  AIGatewayProviderConfig.Type,
  "apiKey" | "baseURL" | "type"
>;

export function fetchAndParseGoogleModels(
  config: AIGatewayProviderConfig.Type,
) {
  return Result.gen(function* () {
    const data = yield* fetchGoogleModels(config);
    const metadata = getProviderMetadata(config.type);

    const modelsResult = yield* Result.try(
      () => GoogleModelsResponseSchema.parse(data),
      (error) =>
        new TypedError.Parse(`Failed to validate models from ${config.type}`, {
          cause: error,
        }),
    );

    const author = config.type;
    return modelsResult.models.map((model) => {
      const providerId = AIGatewayModel.ProviderIdSchema.parse(model.name);
      let canonicalModelId = AIGatewayModel.CanonicalIdSchema.parse(model.name);
      const [prefix, modelId] = model.name.split("/");
      if (prefix === "models") {
        canonicalModelId = AIGatewayModel.CanonicalIdSchema.parse(modelId);
      }

      const tags = getModelTags({
        author,
        canonicalId: canonicalModelId,
        config,
      });
      const features = getModelFeatures(canonicalModelId);

      const params = { provider: config.type, providerConfigId: config.id };
      return {
        author,
        canonicalId: canonicalModelId,
        features,
        name: model.displayName,
        params,
        providerId,
        providerName: config.displayName ?? metadata.name,
        tags,
        uri: AIGatewayModelURI.fromModel({
          author,
          canonicalId: canonicalModelId,
          params,
        }),
      } satisfies AIGatewayModel.Type;
    });
  });
}

export function fetchGoogleModels(
  config: MinimalProviderConfig,
  { cache = true }: { cache?: boolean } = {},
) {
  const headers = new Headers({ "Content-Type": "application/json" });
  setProviderAuthHeaders(headers, config);

  const url = new URL(apiURL({ config, path: "/models" }));
  return fetchJson({
    cache,
    headers,
    url: url.toString(),
  });
}
