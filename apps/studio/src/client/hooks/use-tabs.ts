import { handlers } from "@/client/lib/api";
import { vanillaRpcClient } from "@/client/rpc/client";
import { type TabState } from "@/shared/tabs";
import { useEffect, useState } from "react";

export function useTabs() {
  const [store, setStore] = useState<TabState>({
    selectedTabId: null,
    tabs: [],
  });

  useEffect(() => {
    void vanillaRpcClient.tabs.getState().then((data) => {
      if (data) {
        setStore(data);
      }
    });

    const listeners = [
      handlers.tabsStoreChanged.listen((tabState) => {
        setStore(
          tabState ?? {
            selectedTabId: null,
            tabs: [],
          },
        );
      }),
    ];

    return () => {
      for (const unsubscribe of listeners) {
        unsubscribe();
      }
    };
  }, []);

  return {
    addTab: vanillaRpcClient.tabs.add,
    closeTab: vanillaRpcClient.tabs.close,
    data: store,
    reorderTabs: vanillaRpcClient.tabs.reorder,
    selectTab: vanillaRpcClient.tabs.select,
  };
}
