import { vanillaRpcClient } from "@/client/rpc/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export function useQueryClientSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let isCancelled = false;

    async function subscribe() {
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

    void subscribe();

    return () => {
      isCancelled = true;
    };
  }, [queryClient]);
}
