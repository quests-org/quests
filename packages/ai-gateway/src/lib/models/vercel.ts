import { createGateway } from "@ai-sdk/gateway";
import { Result } from "typescript-result";

import { AIGatewayModel } from "../../schemas/model";
import { AIGatewayModelURI } from "../../schemas/model-uri";
import { type AIGatewayProviderConfig } from "../../schemas/provider-config";
import { getCachedResult, setCachedResult } from "../cache";
import { TypedError } from "../errors";
import { getModelTags } from "../get-model-tags";
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
      const [modelAuthor, modelId] = providerId.split("/");
      if (!modelAuthor || !modelId) {
        return Result.error(
          new TypedError.Parse(`Invalid model ID for vercel: ${model.id}`),
        );
      }

      const canonicalModelId = AIGatewayModel.CanonicalIdSchema.parse(modelId);
      const features: AIGatewayModel.ModelFeatures[] = [];

      if (model.modelType === "language") {
        features.push("tools", "inputText", "outputText");
      }

      const tags = getModelTags(canonicalModelId, config);

      const params = { provider: config.type, providerConfigId: config.id };
      validModels.push({
        author: modelAuthor,
        canonicalId: canonicalModelId,
        features,
        name: model.name,
        params,
        providerId,
        providerName: config.displayName ?? metadata.name,
        tags,
        uri: AIGatewayModelURI.fromModel({
          author: modelAuthor,
          canonicalId: canonicalModelId,
          params,
        }),
      } satisfies AIGatewayModel.Type);
    }

    setCachedResult(cacheKey, validModels);
    return validModels;
  });
}
