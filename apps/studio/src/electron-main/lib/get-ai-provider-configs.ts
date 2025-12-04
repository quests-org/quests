import { getToken } from "@/electron-main/api/utils";
import { getProviderConfigsStore } from "@/electron-main/stores/provider-configs";
import { type AIGatewayProviderConfig } from "@quests/ai-gateway";
import { AIProviderConfigIdSchema } from "@quests/shared";

// Helper to get stored configs and add the Quests config if the user is logged in.
export function getAIProviderConfigs(): AIGatewayProviderConfig.Type[] {
  const providerConfigsStore = getProviderConfigsStore();
  const keyBasedProviderConfigs = [...providerConfigsStore.get("providers")];
  const token = getToken();

  if (token) {
    keyBasedProviderConfigs.push({
      apiKey: token,
      cacheIdentifier: "quests",
      id: AIProviderConfigIdSchema.parse("quests"),
      type: "quests",
    });
  }

  return keyBasedProviderConfigs;
}
