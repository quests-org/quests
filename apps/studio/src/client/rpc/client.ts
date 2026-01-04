import { type router } from "@/electron-main/rpc/routes";
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
  // retry: 3 below are to because our default retry is 0 because most RPC calls
  // are local and won't fix if we retry. These requests ARE remote.
  experimental_defaults: {
    plans: {
      get: {
        queryOptions: {
          retry: 3,
        },
      },
    },
    releases: {
      list: {
        queryOptions: {
          retry: 3,
        },
      },
    },
    user: {
      me: {
        queryOptions: {
          retry: 3,
        },
      },
      subscriptionStatus: {
        queryOptions: {
          retry: 3,
        },
      },
    },
  },
});

export type RPCInput = InferRouterInputs<typeof router>;
export type RPCOutput = InferRouterOutputs<typeof router>;
