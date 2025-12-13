import { apiQueryClient, apiRPCClient } from "@/electron-main/api/client";
import { hasToken } from "@/electron-main/api/utils";
import { base } from "@/electron-main/rpc/base";
import { createAuthenticatedLiveQuery } from "@/electron-main/rpc/lib/create-authenticated-live-query";
import { getProviderConfigsStore } from "@/electron-main/stores/provider-configs";
import { z } from "zod";

const hasAIProviderConfig = base.handler(() => {
  const providersStore = getProviderConfigsStore();
  const providerConfigs = providersStore.get("providers");
  const hasConfig = providerConfigs.length > 0;
  return hasToken() || hasConfig;
});

const me = base.handler(async () => {
  if (!hasToken()) {
    return null;
  }
  return apiQueryClient.fetchQuery(apiRPCClient.users.getMe.queryOptions());
});

const SubscriptionStatusInputSchema = z.union([
  z.void(),
  z.object({ staleTime: z.number().optional().default(30_000) }),
]);
const subscriptionStatus = base
  .input(SubscriptionStatusInputSchema)
  .handler(async ({ input }) => {
    if (!hasToken()) {
      return null;
    }
    return apiQueryClient.fetchQuery(
      apiRPCClient.users.getSubscriptionStatus.queryOptions({
        staleTime: input?.staleTime,
      }),
    );
  });

const live = {
  me: base.handler(async function* ({ signal }) {
    yield* createAuthenticatedLiveQuery({
      getOptions: (enabled) =>
        apiRPCClient.users.getMe.queryOptions({ enabled }),
      queryKey: apiRPCClient.users.getMe.queryKey(),
      signal,
    });
  }),
  subscriptionStatus: base
    .input(SubscriptionStatusInputSchema)
    .handler(async function* ({ input, signal }) {
      yield* createAuthenticatedLiveQuery({
        getOptions: (enabled) =>
          apiRPCClient.users.getSubscriptionStatus.queryOptions({
            enabled,
            staleTime: input?.staleTime,
          }),
        queryKey: apiRPCClient.users.getSubscriptionStatus.queryKey(),
        signal,
      });
    }),
};

export const user = {
  hasAIProviderConfig,
  live,
  me,
  subscriptionStatus,
};
