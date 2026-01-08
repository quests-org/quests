import { rpcClient } from "@/client/rpc/client";
import { useEffect } from "react";

export function useOpenCommandMenu(onOpen: () => void) {
  useEffect(() => {
    let isCancelled = false;

    async function subscribeToOpenProjectLauncher() {
      const subscription =
        await rpcClient.utils.live.openProjectLauncher.call();

      for await (const _ of subscription) {
        if (isCancelled) {
          break;
        }

        onOpen();
      }
    }

    void subscribeToOpenProjectLauncher();

    return () => {
      isCancelled = true;
    };
  }, [onOpen]);
}
