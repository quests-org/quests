import { type contract } from "@/electron-main/api/contract";
import { getToken } from "@/electron-main/api/utils";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { DedupeRequestsPlugin } from "@orpc/client/plugins";
import {
  type ContractRouterClient,
  type InferContractRouterOutputs,
} from "@orpc/contract";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryClient } from "@tanstack/query-core";
import { isEqual } from "radashi";

import { PATHS_TO_DEDUPE } from "./paths-to-dedupe";

const RPC_LINK = new RPCLink({
  headers: () => {
    const token = getToken();
    if (!token) {
      return {};
    }
    return {
      authorization: `Bearer ${token}`,
    };
  },
  plugins: [
    new DedupeRequestsPlugin({
      filter: ({ path }) => {
        return PATHS_TO_DEDUPE.some((rpcPath) => isEqual(rpcPath, path));
      },
      groups: [
        {
          condition: () => true,
          context: {},
        },
      ],
    }),
  ],
  url: `${import.meta.env.MAIN_VITE_QUESTS_API_BASE_URL}/rpc`,
});

const baseClient: ContractRouterClient<typeof contract> =
  createORPCClient(RPC_LINK);
export const apiRPCClient = createTanstackQueryUtils(baseClient);

export type Subscription = Outputs["users"]["getSubscriptionStatus"];
type Outputs = InferContractRouterOutputs<typeof contract>;

export const apiQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
    },
  },
});
