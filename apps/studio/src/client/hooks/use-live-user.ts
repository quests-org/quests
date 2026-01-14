import { rpcClient } from "@/client/rpc/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export function useLiveUser() {
  const { refetch, ...rest } = useQuery(
    rpcClient.user.live.me.experimental_liveOptions(),
  );
  const { data: onWindowFocus } = useQuery(
    rpcClient.utils.live.onWindowFocus.experimental_liveOptions(),
  );

  useEffect(() => {
    void refetch();
  }, [onWindowFocus, refetch]);

  return { ...rest, refetch };
}
