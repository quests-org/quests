import type { QueryClient } from "@tanstack/react-query";

import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { get } from "radashi";

type Procedure = (typeof rpcClient)["user"]["me"];

// Invalidates the query cache when the server asks the client to invalidate
// a procedure. This causes affected queries to refetch.
export async function subscribeToRPCInvalidation({
  queryClient,
}: {
  queryClient: QueryClient;
}) {
  const subscription = await vanillaRpcClient.cache.live.onRPCInvalidation();

  for await (const payload of subscription) {
    for (const rpcPath of payload.rpcPaths) {
      const procedure = get<Procedure>(rpcClient, rpcPath);
      await queryClient.invalidateQueries({ queryKey: procedure.queryKey() });
    }
  }
}
