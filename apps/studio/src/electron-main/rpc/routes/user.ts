import { fetchSubscriptionStatus, getMe } from "@/electron-main/api/client";
import { hasToken as hasTokenUtil } from "@/electron-main/api/utils";
import { authenticatedOptional, base } from "@/electron-main/rpc/base";
import { getProviderConfigsStore } from "@/electron-main/stores/provider-configs";

const hasAIProviderConfig = base.handler(() => {
  const providersStore = getProviderConfigsStore();
  const providerConfigs = providersStore.get("providers");
  const hasConfig = providerConfigs.length > 0;
  return hasTokenUtil() || hasConfig;
});

const me = authenticatedOptional.handler(() => {
  return getMe();
});

const subscriptionStatus = authenticatedOptional.handler(() => {
  return fetchSubscriptionStatus();
});

export const user = {
  hasAIProviderConfig,
  me,
  subscriptionStatus,
};
