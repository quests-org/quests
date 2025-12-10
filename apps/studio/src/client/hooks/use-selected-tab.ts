import { rpcClient } from "@/client/rpc/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function useSelectedTab() {
  const { data: tabState } = useQuery(
    rpcClient.tabs.live.state.experimental_liveOptions(),
  );

  return useMemo(() => {
    if (!tabState?.selectedTabId) {
      return;
    }
    return tabState.tabs.find((tab) => tab.id === tabState.selectedTabId);
  }, [tabState]);
}
