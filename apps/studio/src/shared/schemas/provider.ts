import { AIGatewayProviderConfig } from "@quests/ai-gateway/client";
import { z } from "zod";

export const ClientAIProviderConfigSchema = AIGatewayProviderConfig.Schema.omit(
  { apiKey: true },
).extend({
  maskedApiKey: z.string(),
});

export type ClientAIProviderConfig = z.output<
  typeof ClientAIProviderConfigSchema
>;
