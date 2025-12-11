import type { QueryClient } from "@tanstack/react-query";
import type { AnyRouter } from "@tanstack/react-router";

import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { safe } from "@orpc/client";
import { get, isEqual } from "radashi";

type Procedure = (typeof rpcClient)["user"]["me"];

// Serves two purpose
// 1. Invalidate the query cache when the server asks the client to invalidate
//    a procedure. Causes the query to refetch.
// 2. Invalidate the router when the user changes. Which causes beforeLoad and
//    other TanStack Router hooks to run.
export async function subscribeToRPCInvalidation({
  queryClient,
  router,
}: {
  queryClient: QueryClient;
  router: AnyRouter;
}) {
  const [initialError, initialResult] = await safe(vanillaRpcClient.user.me());
  let hadUser = initialError ? false : !!initialResult;

  const subscription = await vanillaRpcClient.cache.live.onRPCInvalidation();
  const userQueryKey = rpcClient.user.me.queryKey();

  for await (const payload of subscription) {
    for (const rpcPath of payload.rpcPaths) {
      const procedure = get<Procedure>(rpcClient, rpcPath.join("."));
      await queryClient.invalidateQueries({ queryKey: procedure.queryKey() });

      if (isEqual(procedure.queryKey(), userQueryKey)) {
        const [error, result] = await safe(vanillaRpcClient.user.me());
        const hasUser = error ? false : !!result;

        if (hadUser !== hasUser) {
          void router.invalidate();
          hadUser = hasUser;
        }
      }
    }
  }
}
