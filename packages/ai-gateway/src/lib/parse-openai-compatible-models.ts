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

      let canonicalId: AIGatewayModel.CanonicalId;
      let modelAuthor: string = author;
      let modelName: string | undefined;

      // Handle Fireworks model ID format: accounts/{author}/models/{modelId}
      if (
        config.type === "fireworks" &&
        model.id.startsWith("accounts/") &&
        model.id.includes("/models/")
      ) {
        const regex = /^accounts\/([^/]+)\/models\/(.+)$/;
        const match = regex.exec(model.id);
        if (match?.[1] && match[2]) {
          const modelId = match[2];
          canonicalId = AIGatewayModel.CanonicalIdSchema.parse(modelId);
        } else {
          canonicalId = AIGatewayModel.CanonicalIdSchema.parse(providerId);
        }
      } else if (config.type === "groq" && model.id.includes("/")) {
        // Handle Groq model ID format: author/model-id
        const [authorPart, modelId] = model.id.split("/");
        if (authorPart && modelId) {
          canonicalId = AIGatewayModel.CanonicalIdSchema.parse(modelId);
          modelAuthor = authorPart;
        } else {
          canonicalId = AIGatewayModel.CanonicalIdSchema.parse(providerId);
        }
      } else if (config.type === "cerebras" && model.id.includes("-")) {
        // Handle Cerebras model ID format with known prefixes
        const cerebrasAuthorMap: Record<string, string> = {
          gpt: "openai",
          llama: "meta",
          llama3: "meta",
          llama4: "meta",
          qwen: "qwen",
          zai: "zai",
        };

        const firstDashIndex = model.id.indexOf("-");
        const prefix = model.id.slice(0, firstDashIndex).toLowerCase();
        const mappedAuthor = cerebrasAuthorMap[prefix];

        if (mappedAuthor) {
          const modelId = model.id.slice(firstDashIndex + 1);
          canonicalId = AIGatewayModel.CanonicalIdSchema.parse(modelId);
          modelAuthor = mappedAuthor;
          // Use the original provider ID to generate the model name so it's still readable
          modelName = generateModelName(
            AIGatewayModel.CanonicalIdSchema.parse(providerId),
          );
        } else {
          canonicalId = AIGatewayModel.CanonicalIdSchema.parse(providerId);
        }
      } else {
        canonicalId = AIGatewayModel.CanonicalIdSchema.parse(providerId);
      }

      modelName ||= generateModelName(canonicalId);

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
        author: modelAuthor,
        canonicalId,
        features: ["inputText", "outputText", "tools"],
        name: modelName,
        params,
        providerId,
        providerName: config.displayName ?? metadata.name,
        tags,
        uri: AIGatewayModelURI.fromModel({
          author: modelAuthor,
          canonicalId,
          params,
        }),
      } satisfies AIGatewayModel.Type;
    });
  });
}
