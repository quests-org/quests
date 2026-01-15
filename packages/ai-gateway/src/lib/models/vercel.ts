import { createGateway } from "@ai-sdk/gateway";
import { unique } from "radashi";
import { Result } from "typescript-result";

import { AIGatewayModel } from "../../schemas/model";
import { AIGatewayModelURI } from "../../schemas/model-uri";
import { type AIGatewayProviderConfig } from "../../schemas/provider-config";
import { addHeuristicTags } from "../add-heuristic-tags";
import { getCachedResult, setCachedResult } from "../cache";
import { TypedError } from "../errors";
import { getModelFeatures } from "../get-model-features";
import { getProviderMetadata } from "../providers/metadata";

export function fetchModelsForVercel(config: AIGatewayProviderConfig.Type) {
  return Result.gen(function* () {
    const metadata = getProviderMetadata(config.type);
    const cacheKey = `vercel-models-${config.apiKey}`;
    const cachedModels = getCachedResult<AIGatewayModel.Type[]>(cacheKey);

    if (cachedModels !== undefined) {
      return cachedModels;
    }

    const gatewayProvider = createGateway({ apiKey: config.apiKey });
    const { models } = yield* Result.try(
      async () => await gatewayProvider.getAvailableModels(),
      (error) =>
        new TypedError.Fetch("Fetching models from Vercel AI Gateway failed", {
          cause: error,
        }),
    );

    const validModels: AIGatewayModel.Type[] = [];

    for (const model of models) {
      const providerId = AIGatewayModel.ProviderIdSchema.parse(model.id);
      const [author, modelId] = providerId.split("/");
      if (!author || !modelId) {
        return Result.error(
          new TypedError.Parse(`Invalid model ID for vercel: ${model.id}`),
        );
      }

      const canonicalModelId = AIGatewayModel.CanonicalIdSchema.parse(modelId);
      let features = getModelFeatures(canonicalModelId);

      if (model.modelType === "language") {
        features.push("tools", "inputText", "outputText");
        features = unique(features);
      }

      const params = { provider: config.type, providerConfigId: config.id };

      validModels.push(
        addHeuristicTags(
          {
            author,
            canonicalId: canonicalModelId,
            features,
            name: model.name,
            params,
            providerId,
            providerName: config.displayName ?? metadata.name,
            tags: [],
            uri: AIGatewayModelURI.fromModel({
              author,
              canonicalId: canonicalModelId,
              params,
            }),
          },
          config,
        ),
      );
    }

    setCachedResult(cacheKey, validModels);
    return validModels;
  });
}
