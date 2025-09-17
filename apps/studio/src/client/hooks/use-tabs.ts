import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { useQuery } from "@tanstack/react-query";

export function useTabs() {
  const { data } = useQuery(
    rpcClient.tabs.live.state.experimental_liveOptions(),
  );

  return {
    addTab: vanillaRpcClient.tabs.add,
    closeTab: vanillaRpcClient.tabs.close,
    data: data ?? {
      selectedTabId: null,
      tabs: [],
    },
    reorderTabs: vanillaRpcClient.tabs.reorder,
    selectTab: vanillaRpcClient.tabs.select,
  };
}
