import { type router } from "@/electron-main/rpc/routes";
import { QUERY_KEYS } from "@/shared/query-keys";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/message-port";
import {
  type InferRouterInputs,
  type InferRouterOutputs,
  type RouterClient,
} from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

const { port1: clientPort, port2: serverPort } = new MessageChannel();

window.postMessage("start-orpc-client", "*", [serverPort]);

const link = new RPCLink({
  port: clientPort,
});

clientPort.start();

export const vanillaRpcClient: RouterClient<typeof router> =
  createORPCClient(link);
export const rpcClient = createTanstackQueryUtils(vanillaRpcClient, {
  experimental_defaults: {
    auth: {
      hasToken: {
        queryKey: {
          queryKey: QUERY_KEYS.auth.hasToken,
        },
      },
    },
    user: {
      me: {
        queryKey: {
          queryKey: QUERY_KEYS.user.me,
        },
      },
      subscriptionStatus: {
        queryKey: {
          queryKey: QUERY_KEYS.user.subscriptionStatus,
        },
      },
    },
  },
});

export type RPCInput = InferRouterInputs<typeof router>;
export type RPCOutput = InferRouterOutputs<typeof router>;
