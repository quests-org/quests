import { rpcClient } from "@/client/rpc/client";
import { type AppSubdomain } from "@quests/workspace/client";
import { skipToken, useQuery } from "@tanstack/react-query";

export function useAppState({
  subdomain,
}: {
  subdomain: AppSubdomain | typeof skipToken;
}) {
  return useQuery(
    rpcClient.workspace.app.state.live.bySubdomain.experimental_liveOptions({
      input: subdomain === skipToken ? skipToken : { subdomain },
    }),
  );
}
