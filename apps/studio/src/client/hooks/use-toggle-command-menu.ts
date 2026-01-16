import { rpcClient } from "@/client/rpc/client";
import { useEffect } from "react";

export function useToggleCommandMenu(onToggle: () => void) {
  useEffect(() => {
    let isCancelled = false;

    async function subscribeToToggleProjectLauncher() {
      const subscription = await rpcClient.utils.live.toggleCommandMenu.call();

      for await (const _ of subscription) {
        if (isCancelled) {
          break;
        }

        onToggle();
      }
    }

    void subscribeToToggleProjectLauncher();

    return () => {
      isCancelled = true;
    };
  }, [onToggle]);
}
