import { type router } from "@/electron-main/rpc/routes";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/message-port";
import { type InferRouterOutputs, type RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

const { port1: clientPort, port2: serverPort } = new MessageChannel();

window.postMessage("start-orpc-client", "*", [serverPort]);

const link = new RPCLink({
  port: clientPort,
});

clientPort.start();

export const vanillaRpcClient: RouterClient<typeof router> =
  createORPCClient(link);
export const rpcClient = createTanstackQueryUtils(vanillaRpcClient);

// Used to infer the type of the data from async generator RPC outputs
export type AsyncGeneratorYield<T> =
  T extends AsyncGenerator<infer U, unknown, unknown> ? U : never;

export type RPCOutput = InferRouterOutputs<typeof router>;
