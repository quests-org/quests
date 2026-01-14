import { type CaptureExceptionFunction } from "@quests/shared";
import { Result } from "typescript-result";
import { z } from "zod";

import { AIGatewayModel } from "../../schemas/model";
import { AIGatewayModelURI } from "../../schemas/model-uri";
import { type AIGatewayProviderConfig } from "../../schemas/provider-config";
import { canonicalizeAnthropicModelId } from "../canonicalize-model-id";
import { TypedError } from "../errors";
import { fetchJson } from "../fetch-json";
import { generateModelName } from "../generate-model-name";
import { getModelFeatures } from "../get-model-features";
import { getModelTags } from "../get-model-tags";
import { isModelNew } from "../is-model-new";
import { parseModelDate } from "../parse-model-date";
import { apiURL } from "../providers/api-url";
import { getProviderMetadata } from "../providers/metadata";
import { setProviderAuthHeaders } from "../providers/set-auth-headers";

const ModelSchema = z.object({
  created_at: z.string().optional(),
  display_name: z.string().optional(),
  id: z.string(),
  type: z.string().optional(),
});

type Model = z.infer<typeof ModelSchema>;

const AnthropicModelsResponseSchema = z.object({
  data: z.array(ModelSchema),
  first_id: z.string().optional(),
  has_more: z.boolean().optional(),
  last_id: z.string().optional(),
});

type MinimalProviderConfig = Pick<
  AIGatewayProviderConfig.Type,
  "apiKey" | "baseURL" | "type"
>;

export function fetchAndParseAnthropicModels(
  config: AIGatewayProviderConfig.Type,
  { captureException }: { captureException: CaptureExceptionFunction },
) {
  return Result.gen(function* () {
    const data = yield* fetchAnthropicModels(config);
    const metadata = getProviderMetadata(config.type);

    const modelsResult = yield* Result.try(
      () => AnthropicModelsResponseSchema.parse(data),
      (error) =>
        new TypedError.Parse(`Failed to validate models from ${config.type}`, {
          cause: error,
        }),
    );

    if (modelsResult.has_more) {
      captureException(
        new Error(
          `Anthropic models response indicates pagination (has_more: true), but pagination is not supported`,
        ),
      );
    }

    const author = config.type;
    const modelMap = new Map<
      string,
      {
        canonicalModelId: AIGatewayModel.CanonicalId;
        model: Model;
      }
    >();

    for (const model of modelsResult.data) {
      const normalizedModelId = canonicalizeAnthropicModelId(model.id);
      const canonicalModelId =
        AIGatewayModel.CanonicalIdSchema.parse(normalizedModelId);

      const existing = modelMap.get(canonicalModelId);
      const shouldReplace =
        !existing ||
        parseModelDate(model.created_at) >
          parseModelDate(existing.model.created_at);

      if (shouldReplace) {
        modelMap.set(canonicalModelId, {
          canonicalModelId,
          model,
        });
      }
    }

    return [...modelMap.values()].map(({ canonicalModelId, model }) => {
      const providerId = AIGatewayModel.ProviderIdSchema.parse(model.id);

      const tags = getModelTags({
        author,
        canonicalId: canonicalModelId,
        config,
      });
      if (isModelNew(model.created_at)) {
        tags.push("new");
      }

      const features = getModelFeatures(canonicalModelId);

      const params = { provider: config.type, providerConfigId: config.id };
      return {
        author,
        canonicalId: canonicalModelId,
        features,
        name: model.display_name ?? generateModelName(canonicalModelId),
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

export function fetchAnthropicModels(
  config: MinimalProviderConfig,
  { cache = true }: { cache?: boolean } = {},
) {
  const headers = new Headers({ "Content-Type": "application/json" });
  setProviderAuthHeaders(headers, config);

  const url = new URL(apiURL({ config, path: "/models" }));
  url.searchParams.set("limit", "1000");

  return fetchJson({
    cache,
    headers,
    url: url.toString(),
  });
}
