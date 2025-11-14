import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { type Tab } from "@/shared/tabs";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

const EMPTY_TABS: Tab[] = [];

const tabMethods = {
  addTab: vanillaRpcClient.tabs.add,
  closeTab: vanillaRpcClient.tabs.close,
  reorderTabs: vanillaRpcClient.tabs.reorder,
  selectTab: vanillaRpcClient.tabs.select,
};

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

export function useSelectedTabId() {
  const { data } = useQuery({
    ...rpcClient.tabs.live.state.experimental_liveOptions(),
    select: (d) => d?.selectedTabId ?? null,
  });

  return data ?? null;
}

export function useTabActions() {
  return tabMethods;
}

export function useTabs() {
  const { data } = useQuery(
    rpcClient.tabs.live.state.experimental_liveOptions(),
  );

  return data?.tabs ?? EMPTY_TABS;
}
