import { vanillaRpcClient } from "@/client/rpc/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export function useQueryClientSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let isCancelled = false;

    async function subscribeToCacheInvalidation() {
      const subscription =
        await vanillaRpcClient.cache.live.onQueryInvalidation();

      for await (const payload of subscription) {
        if (isCancelled) {
          break;
        }

        for (const queryKey of payload.invalidatedQueryKeys ?? []) {
          await queryClient.invalidateQueries({
            queryKey,
          });
        }
      }
    }

    async function subscribeToCacheUpdate() {
      const subscription = await vanillaRpcClient.cache.live.onQueryUpdate();

      for await (const payload of subscription) {
        if (isCancelled) {
          break;
        }

        for (const update of payload.updates) {
          await queryClient.setQueryData(update.queryKey, update.data);
        }
      }
    }

    void subscribeToCacheInvalidation();
    void subscribeToCacheUpdate();

    return () => {
      isCancelled = true;
    };
  }, [queryClient]);
}
