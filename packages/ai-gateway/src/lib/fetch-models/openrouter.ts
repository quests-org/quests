import { Result } from "typescript-result";
import { z } from "zod";

import { AIGatewayModel } from "../../schemas/model";
import { AIGatewayModelURI } from "../../schemas/model-uri";
import { type AIGatewayProviderConfig } from "../../schemas/provider-config";
import { addHeuristicTags } from "../add-heuristic-tags";
import { TypedError } from "../errors";
import { generateModelName } from "../generate-model-name";
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
  created: z.number(),
  description: z.string(),
  id: z.string(),
  name: z.string(),
  supported_parameters: z.array(z.string()).nullish(),
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
      const [author, modelId] = providerId.split("/");
      if (!author || !modelId) {
        return Result.error(
          new TypedError.Parse(`Invalid model ID for openrouter: ${model.id}`),
        );
      }

      const canonicalModelId = AIGatewayModel.CanonicalIdSchema.parse(modelId);

      const features: AIGatewayModel.ModelFeatures[] = [];

      if (model.architecture.input_modalities.includes("text")) {
        // OpenRouter automatically converts PDFs to text for all models
        features.push("inputText", "inputFile");
      }
      if (model.architecture.input_modalities.includes("audio")) {
        features.push("inputAudio");
      }
      if (model.architecture.input_modalities.includes("image")) {
        features.push("inputImage");
      }
      if (model.architecture.output_modalities.includes("text")) {
        features.push("outputText");
      }
      if (model.supported_parameters?.includes("tools")) {
        features.push("tools");
      }

      const tags: AIGatewayModel.ModelTag[] = [];
      if (isModelNew(model.created)) {
        tags.push("new");
      }

      const params = {
        provider: config.type,
        providerConfigId: config.id,
      };
      const colonIndex = model.name.indexOf(":");
      const modelName =
        colonIndex === -1
          ? model.name || generateModelName(canonicalModelId)
          : model.name.slice(colonIndex + 1);

      validModels.push(
        addHeuristicTags(
          {
            author,
            canonicalId: canonicalModelId,
            features,
            name: modelName,
            params,
            providerId,
            providerName: config.displayName ?? metadata.name,
            tags,
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

    // Exacto variants (`:exacto` suffix) route to providers with higher
    // tool-calling accuracy. When available, transfer "recommended"/"default"
    // tags from base models to Exacto variants.
    // See: https://openrouter.ai/docs/features/exacto-variant
    const baseModelsWithExacto = new Set<string>();

    for (const model of validModels) {
      if (model.canonicalId.endsWith(":exacto")) {
        const baseModelId = model.canonicalId.slice(0, -7);
        baseModelsWithExacto.add(baseModelId);
      }
    }

    for (const model of validModels) {
      const isExactoModel = model.canonicalId.endsWith(":exacto");

      if (isExactoModel) {
        model.tags.push("exacto");
        // We will display this in the UI with a tag to not confuse users
        model.name = model.name.replace(/\s*\(exacto\)\s*$/i, "");
        const baseModelId = model.canonicalId.slice(0, -7);
        const baseModel = addHeuristicTags(
          {
            ...model,
            canonicalId: AIGatewayModel.CanonicalIdSchema.parse(baseModelId),
            tags: [],
          },
          config,
        );

        for (const tag of baseModel.tags) {
          if (!model.tags.includes(tag)) {
            model.tags.push(tag);
          }
        }
      } else if (baseModelsWithExacto.has(model.canonicalId)) {
        model.tags = model.tags.filter(
          (tag) => tag !== "recommended" && tag !== "default",
        );
      }
    }

    return validModels;
  });
}
