import type { QueryClient } from "@tanstack/react-query";

import { vanillaRpcClient } from "@/client/rpc/client";

export async function subscribeToCacheDataUpdates(queryClient: QueryClient) {
  const updateSubscription = await vanillaRpcClient.cache.live.onQueryUpdate();

  for await (const payload of updateSubscription) {
    for (const update of payload.updates) {
      await queryClient.setQueryData(update.queryKey, update.data);
    }
  }
}

export async function subscribeToCacheUpdates(queryClient: QueryClient) {
  const invalidationSubscription =
    await vanillaRpcClient.cache.live.onQueryInvalidation();

  for await (const payload of invalidationSubscription) {
    for (const queryKey of payload.invalidatedQueryKeys ?? []) {
      await queryClient.invalidateQueries({
        queryKey,
      });
    }
  }
}
