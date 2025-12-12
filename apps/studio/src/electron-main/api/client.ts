import { API_RPC_BASE_URL } from "@/electron-main/api/constants";
import { type contract } from "@/electron-main/api/contract";
import { getToken } from "@/electron-main/api/utils";
import { publisher } from "@/electron-main/rpc/publisher";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { DedupeRequestsPlugin } from "@orpc/client/plugins";
import {
  type ContractRouterClient,
  type InferContractRouterOutputs,
} from "@orpc/contract";
import { QueryClient } from "@tanstack/query-core";

import { captureServerException } from "../lib/capture-server-exception";
import { invalidateClientQueries } from "../lib/invalidate-client-queries";

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
        return (
          path.join(".").includes("users.getMe") ||
          path.join(".").includes("users.getSubscriptionStatus") ||
          path.join(".").includes("plans.get")
        );
      },
      groups: [
        {
          condition: () => true,
          context: {},
        },
      ],
    }),
  ],
  url: API_RPC_BASE_URL,
});

export const client: ContractRouterClient<typeof contract> =
  createORPCClient(RPC_LINK);

export type Subscription = Outputs["users"]["getSubscriptionStatus"];

type Outputs = InferContractRouterOutputs<typeof contract>;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
    },
  },
});

queryClient.getQueryCache().subscribe((event) => {
  if (
    (event.type === "updated" &&
      ["setState", "success"].includes(event.action.type)) ||
    event.type === "removed"
  ) {
    // Could be made more granular, but fine for now.
    invalidateClientQueries(["user.updated", "subscription.updated"]);
    return;
  }
});

void publisher.subscribe("auth.updated", () => {
  // Must use resetQueries instead of other methods because it doesn't remove
  // the subscriber above.
  void queryClient.resetQueries().catch((error: unknown) => {
    captureServerException(error, { scopes: ["api"] });
  });
});

export async function fetchSubscriptionStatus({
  staleTime = 30_000,
}: {
  staleTime?: number;
}) {
  return await queryClient.fetchQuery({
    queryFn: () => client.users.getSubscriptionStatus(),
    queryKey: ["users", "getSubscriptionStatus"],
    staleTime,
  });
}

export async function getMe() {
  const data = await queryClient.fetchQuery({
    queryFn: () => client.users.getMe(),
    queryKey: ["users", "getMe"],
  });
  return data;
}
