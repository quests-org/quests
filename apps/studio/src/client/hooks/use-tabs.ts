import { rpcClient } from "@/client/rpc/client";
import { type Tab } from "@/shared/tabs";
import { useQuery } from "@tanstack/react-query";

const EMPTY_TABS: Tab[] = [];

export function useTabs() {
  const { data } = useQuery(
    rpcClient.tabs.live.state.experimental_liveOptions(),
  );

  return data?.tabs ?? EMPTY_TABS;
}
