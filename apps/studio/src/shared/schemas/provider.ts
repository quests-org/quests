import { AIGatewayProvider } from "@quests/ai-gateway";
import { z } from "zod";

export const StoreAIProviderId = z.string().brand("AIProviderId");

export const StoreAIProviderSchema = AIGatewayProvider.Schema.extend({
  id: StoreAIProviderId,
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ClientAIProviderSchema = StoreAIProviderSchema.omit({
  apiKey: true,
}).extend({
  maskedApiKey: z.string(),
});

export type ClientAIProvider = z.output<typeof ClientAIProviderSchema>;
