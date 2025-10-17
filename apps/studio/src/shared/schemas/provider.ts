import { AIGatewayProviderConfig } from "@quests/ai-gateway";
import { z } from "zod";

export const StoreAIProviderConfigId = z
  .string()
  .brand("StoreAIProviderConfigId");

export const StoreAIProviderConfigSchema =
  AIGatewayProviderConfig.Schema.extend({
    id: StoreAIProviderConfigId,
  });

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ClientAIProviderConfigSchema = StoreAIProviderConfigSchema.omit({
  apiKey: true,
}).extend({
  maskedApiKey: z.string(),
});

export type ClientAIProviderConfig = z.output<
  typeof ClientAIProviderConfigSchema
>;
