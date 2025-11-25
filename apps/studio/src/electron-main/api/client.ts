import { API_RPC_BASE_URL } from "@/electron-main/api/constants";
import { type contract } from "@/electron-main/api/contract";
import { getToken } from "@/electron-main/api/utils";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { DedupeRequestsPlugin } from "@orpc/client/plugins";
import { type ContractRouterClient } from "@orpc/contract";

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
