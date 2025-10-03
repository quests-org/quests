import { vanillaRpcClient } from "@/client/rpc/client";
import { useEffect } from "react";

export function useReload(onReload?: () => void) {
  useEffect(() => {
    let isCancelled = false;

    async function subscribeToReload() {
      const subscription = await vanillaRpcClient.utils.live.reload();

      for await (const _ of subscription) {
        if (isCancelled) {
          break;
        }

        if (onReload) {
          onReload();
        } else {
          window.location.reload();
        }
      }
    }

    void subscribeToReload();

    return () => {
      isCancelled = true;
    };
  }, [onReload]);
}
