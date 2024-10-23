import { AIProviderTypeSchema } from "@quests/shared";
import { z } from "zod";

export namespace AIGatewayProvider {
  export const Schema = z.object({
    // For easy auto-completion
    apiKey: z.custom<"NOT_NEEDED" | (string & {})>(
      (v) => typeof v === "string",
    ),
    baseURL: z.string().optional(),
    cacheIdentifier: z.string(),
    type: AIProviderTypeSchema,
  });
  export type GetAIProviders = () => Type[];
  export type Type = z.output<typeof Schema>;
}
