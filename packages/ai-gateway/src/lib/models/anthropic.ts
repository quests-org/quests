import { Result } from "typescript-result";
import { z } from "zod";

import { AIGatewayModel } from "../../schemas/model";
import { AIGatewayModelURI } from "../../schemas/model-uri";
import { type AIGatewayProviderConfig } from "../../schemas/provider-config";
import { canonicalizeAnthropicModelId } from "../canonicalize-model-id";
import { TypedError } from "../errors";
import { fetchJson } from "../fetch-json";
import { generateModelName } from "../generate-model-name";
import { getModelTags } from "../get-model-tags";
import { isModelNew } from "../is-model-new";
import { apiURL } from "../providers/api-url";
import { getProviderMetadata } from "../providers/metadata";
import { setProviderAuthHeaders } from "../providers/set-auth-headers";

const ModelSchema = z.object({
  created_at: z.string().optional(),
  display_name: z.string().optional(),
  id: z.string(),
  type: z.string().optional(),
});

const AnthropicModelsResponseSchema = z.object({
  data: z.array(ModelSchema),
  first_id: z.string().optional(),
  has_more: z.boolean().optional(),
  last_id: z.string().optional(),
});

export function fetchModelsForAnthropic(
  config: AIGatewayProviderConfig.Type,
  { captureException }: { captureException: (error: Error) => void },
) {
  return Result.gen(function* () {
    const metadata = getProviderMetadata(config.type);
    const headers = new Headers({ "Content-Type": "application/json" });
    setProviderAuthHeaders(headers, config);

    const url = new URL(apiURL({ config, path: "/v1/models" }));
    url.searchParams.set("limit", "1000");

    const data = yield* fetchJson({
      headers,
      url: url.toString(),
    });

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
    return modelsResult.data.map((model) => {
      const providerId = AIGatewayModel.ProviderIdSchema.parse(model.id);
      const normalizedModelId = canonicalizeAnthropicModelId(model.id);
      const canonicalModelId =
        AIGatewayModel.CanonicalIdSchema.parse(normalizedModelId);

      const tags = getModelTags(canonicalModelId, config);
      if (isModelNew(model.created_at)) {
        tags.push("new");
      }

      const features: AIGatewayModel.ModelFeatures[] = [];

      // All claude models support inputText, outputText, and tools
      if (normalizedModelId.startsWith("claude-")) {
        features.push("inputText", "outputText", "tools");
      }

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
