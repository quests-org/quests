import { Result } from "typescript-result";
import { z } from "zod";

import { AIGatewayModel } from "../../schemas/model";
import { AIGatewayModelURI } from "../../schemas/model-uri";
import { type AIGatewayProviderConfig } from "../../schemas/provider-config";
import { TypedError } from "../errors";
import { generateModelName } from "../generate-model-name";
import { getModelTags } from "../get-model-tags";
import { isModelNew } from "../is-model-new";
import { getProviderMetadata } from "../providers/metadata";
import { fetchOpenAICompatibleModels } from "./openai-compatible";

type InputModalities = "audio" | "file" | "image" | "text" | (string & {});
type OutputModalities = "text" | (string & {});

// Loose validation of just a string, but want inference for TypeScript
const InputModalitySchema = z.custom<InputModalities>(
  (v) => typeof v === "string",
);
const OutputModalitySchema = z.custom<OutputModalities>(
  (v) => typeof v === "string",
);

const OpenRouterSchema = z.object({
  architecture: z.object({
    input_modalities: InputModalitySchema.array(),
    instruct_type: z.string().nullish(),
    output_modalities: OutputModalitySchema.array(),
    tokenizer: z.string(),
  }),
  canonical_slug: z.string().nullish(),
  context_length: z.number().nullish(),
  created: z.number(),
  description: z.string(),
  hugging_face_id: z.string().nullish(),
  id: z.string(),
  name: z.string(),
  per_request_limits: z.record(z.string(), z.number()).nullish(),
  pricing: z.object({
    completion: z.string(),
    image: z.string().nullish(),
    input_cache_read: z.string().nullish(),
    input_cache_write: z.string().nullish(),
    internal_reasoning: z.string().nullish(),
    prompt: z.string(),
    request: z.string().nullish(),
    web_search: z.string().nullish(),
  }),
  supported_parameters: z.array(z.string()).nullish(),
  top_provider: z.object({
    context_length: z.number().nullish(),
    is_moderated: z.boolean(),
    max_completion_tokens: z.number().nullish(),
  }),
});

const OpenRouterModelsResponseSchema = z.object({
  data: z.array(OpenRouterSchema),
});

export function fetchModelsForOpenRouter(config: AIGatewayProviderConfig.Type) {
  return Result.gen(function* () {
    const metadata = getProviderMetadata(config.type);

    const data = yield* fetchOpenAICompatibleModels(config);

    const modelsResult = yield* Result.try(
      () => OpenRouterModelsResponseSchema.parse(data),
      (error) =>
        new TypedError.Parse(`Failed to validate models from ${config.type}`, {
          cause: error,
        }),
    );

    const validModels: AIGatewayModel.Type[] = [];
    for (const model of modelsResult.data) {
      const providerId = AIGatewayModel.ProviderIdSchema.parse(model.id);
      const [modelAuthor, modelId] = providerId.split("/");
      if (!modelAuthor || !modelId) {
        return Result.error(
          new TypedError.Parse(`Invalid model ID for openrouter: ${model.id}`),
        );
      }

      const canonicalModelId = AIGatewayModel.CanonicalIdSchema.parse(modelId);

      const features: AIGatewayModel.ModelFeatures[] = [];

      if (model.architecture.input_modalities.includes("text")) {
        features.push("inputText");
      }
      if (model.architecture.output_modalities.includes("text")) {
        features.push("outputText");
      }
      if (model.supported_parameters?.includes("tools")) {
        features.push("tools");
      }

      const tags = getModelTags(canonicalModelId, config);
      if (isModelNew(model.created)) {
        tags.push("new");
      }

      const params = {
        provider: config.type,
        providerConfigId: config.id,
      };
      const [_authorName, ...modelNameParts] = model.name.split(":");
      const modelName =
        modelNameParts.join(":") || generateModelName(canonicalModelId);

      validModels.push({
        author: modelAuthor,
        canonicalId: canonicalModelId,
        features,
        name: modelName,
        params,
        providerId,
        providerName: config.displayName ?? metadata.name,
        tags,
        uri: AIGatewayModelURI.fromModel({
          author: modelAuthor,
          canonicalId: canonicalModelId,
          params,
        }),
      });
    }
    return validModels;
  });
}
