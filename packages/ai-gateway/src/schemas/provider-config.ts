// FYI this module is used on the client, so no node imports
import {
  type AI_GATEWAY_API_KEY_NOT_NEEDED,
  AIProviderConfigIdSchema,
  AIProviderConfigSubTypeSchema,
  AIProviderTypeSchema,
} from "@quests/shared";
import { z } from "zod";

export namespace AIGatewayProviderConfig {
  export const Schema = z.object({
    // For easy auto-completion
    apiKey: z.custom<(string & {}) | typeof AI_GATEWAY_API_KEY_NOT_NEEDED>(
      (v) => typeof v === "string",
    ),
    baseURL: z.string().optional(),
    cacheIdentifier: z.string(),
    displayName: z.string().optional(),
    id: AIProviderConfigIdSchema,
    subType: AIProviderConfigSubTypeSchema.optional(),
    type: AIProviderTypeSchema,
  });
  export type Type = z.output<typeof Schema>;
}
