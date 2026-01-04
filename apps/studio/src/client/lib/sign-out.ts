import { rpcClient } from "@/client/rpc/client";

import { captureClientEvent } from "./capture-client-event";

export async function signOut() {
  await rpcClient.auth.signOut.call();
  captureClientEvent("auth.signed_out");
}
