import { getToken } from "@/electron-main/api/utils";
import { getProviderConfigsStore } from "@/electron-main/stores/provider-configs";
import { type AIGatewayProviderConfig } from "@quests/ai-gateway";

// Helper to get stored configs and add the Quests config if the user is logged in.
export function getAIProviderConfigs(): AIGatewayProviderConfig.Type[] {
  const providerConfigsStore = getProviderConfigsStore();
  const keyBasedProviderConfigs = [...providerConfigsStore.get("providers")];
  const token = getToken();

  if (token) {
    keyBasedProviderConfigs.push({
      apiKey: token,
      baseURL: `${import.meta.env.MAIN_VITE_QUESTS_API_BASE_URL}/gateway/openrouter`,
      cacheIdentifier: "quests",
      id: "quests",
      type: "quests",
    });
  }

  return keyBasedProviderConfigs;
}
