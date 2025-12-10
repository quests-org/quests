import { rpcClient } from "@/client/rpc/client";
import { useQuery } from "@tanstack/react-query";

export function useSelectedTabId() {
  const { data } = useQuery({
    ...rpcClient.tabs.live.state.experimental_liveOptions(),
    select: (d) => d?.selectedTabId ?? null,
  });

  return data ?? null;
}
