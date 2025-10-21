import { Result } from "typescript-result";
import { z } from "zod";

import { AIGatewayModel } from "../schemas/model";
import { AIGatewayModelURI } from "../schemas/model-uri";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { TypedError } from "./errors";
import { generateModelName } from "./generate-model-name";
import { getModelTags } from "./get-model-tags";
import { isModelNew } from "./is-model-new";
import { getProviderMetadata } from "./providers/metadata";

const ModelSchema = z.object({
  created: z.number().optional(),
  id: z.string(),
  object: z.string().optional(),
  owned_by: z.string().optional(),
});

export function parseOpenAICompatibleModels(
  data: unknown,
  config: AIGatewayProviderConfig.Type,
) {
  return Result.gen(function* () {
    const modelsResult = yield* Result.try(
      () => z.object({ data: z.array(ModelSchema) }).parse(data),
      (error) =>
        new TypedError.Parse(`Failed to validate models from ${config.type}`, {
          cause: error,
        }),
    );

    const metadata = getProviderMetadata(config.type);
    const author = config.type;

    return modelsResult.data.map((model) => {
      const providerId = AIGatewayModel.ProviderIdSchema.parse(model.id);
      const canonicalId = AIGatewayModel.CanonicalIdSchema.parse(providerId);
      const tags = getModelTags(canonicalId, config);
      const isNew = isModelNew(model.created);
      if (isNew) {
        tags.push("new");
      }
      const params = {
        provider: config.type,
        providerConfigId: config.id,
      };
      return {
        author,
        canonicalId,
        features: ["inputText", "outputText", "tools"],
        name: generateModelName(canonicalId),
        params,
        providerId,
        providerName: config.displayName ?? metadata.name,
        tags,
        uri: AIGatewayModelURI.fromModel({
          author,
          canonicalId,
          params,
        }),
      } satisfies AIGatewayModel.Type;
    });
  });
}
