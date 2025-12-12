import { fetchSubscriptionStatus, getMe } from "@/electron-main/api/client";
import { hasToken as hasTokenUtil } from "@/electron-main/api/utils";
import { authenticatedOptional, base } from "@/electron-main/rpc/base";
import { getProviderConfigsStore } from "@/electron-main/stores/provider-configs";
import { z } from "zod";

const hasAIProviderConfig = base.handler(() => {
  const providersStore = getProviderConfigsStore();
  const providerConfigs = providersStore.get("providers");
  const hasConfig = providerConfigs.length > 0;
  return hasTokenUtil() || hasConfig;
});

const me = authenticatedOptional
  .meta({ invalidateClientsOn: ["user.updated"] })
  .handler(() => {
    return getMe();
  });

const subscriptionStatus = authenticatedOptional
  .meta({ invalidateClientsOn: ["subscription.updated"] })
  .input(z.void().or(z.object({ staleTime: z.number().optional() })))
  .handler(({ input }) => {
    return fetchSubscriptionStatus(input ? { staleTime: input.staleTime } : {});
  });

export const user = {
  hasAIProviderConfig,
  me,
  subscriptionStatus,
};
