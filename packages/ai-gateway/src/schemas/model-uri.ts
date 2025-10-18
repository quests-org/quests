import {
  type AIProviderConfigId,
  AIProviderConfigIdSchema,
  type AIProviderConfigSubType,
  AIProviderConfigSubTypeSchema,
  type AIProviderType,
  AIProviderTypeSchema,
} from "@quests/shared";
import { shake } from "radashi";
import { Result } from "typescript-result";
import { z } from "zod";

import { TypedError } from "../lib/errors";

// Model URIs contain all of the data from a model, but they do contain enough
// to identify the model on the server.
export namespace AIGatewayModelURI {
  export const ParamsSchema = z.object({
    provider: AIProviderTypeSchema,
    providerConfigId: AIProviderConfigIdSchema,
    providerSubType: AIProviderConfigSubTypeSchema.optional(),
  });
  export type Params = z.output<typeof ParamsSchema>;
  export const CanonicalIdSchema = z
    .string()
    .brand<"AIGatewayCanonicalModelId">();
  type CanonicalId = z.output<typeof CanonicalIdSchema>;

  export const Schema = z
    .string()
    .brand<"AIGatewayModelURI">()
    .refine(
      (uri) => {
        const result = parse(uri);
        return result.ok;
      },
      { error: "Invalid AI Gateway model URI." },
    );

  export type Type = z.output<typeof Schema>;

  export function fromModel(model: {
    author: string;
    canonicalId: CanonicalId;
    params: {
      provider: AIProviderType;
      providerConfigId: AIProviderConfigId;
      providerSubType?: AIProviderConfigSubType;
    };
  }) {
    const { author, canonicalId, params } = model;
    const baseUri = `${author}/${canonicalId}`;

    const filteredParams = shake(params);
    const queryParams = new URLSearchParams(filteredParams);
    return Schema.parse(`${baseUri}?${queryParams.toString()}`);
  }

  export function parse(uri: string) {
    const partsResult = parseURIParts(uri);
    if (!partsResult.ok) {
      return partsResult;
    }

    const { author, canonicalId, queryPart } = partsResult.value;

    const queryParams = new URLSearchParams(queryPart);
    const paramsObject = Object.fromEntries(queryParams.entries());
    const paramsResult = ParamsSchema.safeParse(paramsObject);

    if (!paramsResult.success) {
      return Result.error(
        new TypedError.Parse(`Invalid parameters for model URI: ${uri}`, {
          cause: paramsResult.error,
        }),
      );
    }

    return Result.ok({
      author,
      canonicalId,
      params: paramsResult.data,
    });
  }

  export function parseURIParts(uri: string) {
    const [pathPart, queryPart] = uri.split("?");

    if (!pathPart || !queryPart) {
      return Result.error(new TypedError.Parse(`Invalid model URI: ${uri}`));
    }

    const [author, canonicalId] = pathPart.split("/");

    if (!author || !canonicalId) {
      return Result.error(new TypedError.Parse(`Invalid model URI: ${uri}`));
    }

    return Result.ok({ author, canonicalId, pathPart, queryPart });
  }
}
