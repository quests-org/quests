import { questsAccountsEnabledAtom } from "@/client/atoms/features";
import { rpcClient, type RPCInput } from "@/client/rpc/client";
import { skipToken, useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useEffect } from "react";

export function useLiveUser({
  input,
}: { input?: RPCInput["user"]["live"]["me"] | typeof skipToken } = {}) {
  const questsAccountsEnabled = useAtomValue(questsAccountsEnabledAtom);
  const resolvedInput =
    !questsAccountsEnabled || input === skipToken ? skipToken : (input ?? {});
  const { refetch, ...rest } = useQuery(
    rpcClient.user.live.me.experimental_liveOptions({
      input: resolvedInput,
    }),
  );
  const { data: onWindowFocus } = useQuery(
    rpcClient.utils.live.onWindowFocus.experimental_liveOptions(),
  );

  useEffect(() => {
    void refetch();
  }, [onWindowFocus, refetch]);

  return { ...rest, refetch };
}
