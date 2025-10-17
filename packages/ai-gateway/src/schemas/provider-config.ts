import { AIProviderTypeSchema } from "@quests/shared";
import { z } from "zod";

export namespace AIGatewayProviderConfig {
  export const Schema = z.object({
    // For easy auto-completion
    apiKey: z.custom<"NOT_NEEDED" | (string & {})>(
      (v) => typeof v === "string",
    ),
    baseURL: z.string().optional(),
    cacheIdentifier: z.string(),
    displayName: z.string().optional(),
    subType: z
      .string()
      .optional()
      .meta({ description: "Used by OpenAI-compatible providers" }),
    type: AIProviderTypeSchema,
  });
  export type Type = z.output<typeof Schema>;
}
