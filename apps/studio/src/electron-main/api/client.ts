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
import { generateOperationKey } from "@orpc/tanstack-query";
import { QueryClient } from "@tanstack/query-core";

const link = new RPCLink({
  headers: () => ({
    authorization: `Bearer ${getToken() ?? ""}`,
  }),
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
  createORPCClient(link);

export type Subscription = Outputs["users"]["getSubscriptionStatus"];
// export type User = Outputs["users"]["getMe"];

type Outputs = InferContractRouterOutputs<typeof contract>;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
    },
  },
});

// Use ORPC's generateOperationKey to generate query keys that are consistent
// with the main process's query client and the client-side query client.
const QUERY_KEYS = {
  "auth.hasToken": generateOperationKey(["auth", "hasToken"]),
  "user.me": generateOperationKey(["user", "me"]),
  "user.subscriptionStatus": generateOperationKey([
    "user",
    "subscriptionStatus",
  ]),
};

const DEPENDENT_QUERY_KEYS = {
  signIn: [
    QUERY_KEYS["auth.hasToken"],
    QUERY_KEYS["user.me"],
    QUERY_KEYS["user.subscriptionStatus"],
  ],
  signOut: [
    QUERY_KEYS["auth.hasToken"],
    QUERY_KEYS["user.me"],
    QUERY_KEYS["user.subscriptionStatus"],
  ],
};

export type QueryKey = QueryKeys[keyof QueryKeys];
type QueryKeys = typeof QUERY_KEYS;

export async function fetchSubscriptionStatus({
  staleTime = 30_000,
}: {
  staleTime?: number;
}) {
  return queryClient.fetchQuery({
    queryFn: () => client.users.getSubscriptionStatus(),
    queryKey: QUERY_KEYS["user.subscriptionStatus"],
    staleTime,
  });
}

export async function getMe() {
  const data = await queryClient.fetchQuery({
    queryFn: () => client.users.getMe(),
    queryKey: QUERY_KEYS["user.me"],
  });
  return data;
}

export async function onSignIn() {
  await invalidateCacheKeys(DEPENDENT_QUERY_KEYS.signIn);
}

export async function onSignOut() {
  await invalidateCacheKeys(DEPENDENT_QUERY_KEYS.signOut);
}

async function invalidateCacheKeys(cacheKeys: QueryKey[]) {
  for (const cacheKey of cacheKeys) {
    await queryClient.invalidateQueries({
      queryKey: cacheKey,
    });
  }

  publisher.publish("cache.invalidated", {
    invalidatedQueryKeys: cacheKeys,
  });
}
