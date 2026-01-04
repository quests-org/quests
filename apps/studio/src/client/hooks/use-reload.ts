import { rpcClient } from "@/client/rpc/client";
import { useEffect } from "react";

export function useReload(onReload: () => void) {
  useEffect(() => {
    let isCancelled = false;

    async function subscribeToReload() {
      const subscription = await rpcClient.utils.live.reload.call();

      for await (const _ of subscription) {
        if (isCancelled) {
          break;
        }

        onReload();
      }
    }

    void subscribeToReload();

    return () => {
      isCancelled = true;
    };
  }, [onReload]);
}
