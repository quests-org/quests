import { vanillaRpcClient } from "@/client/rpc/client";

import { captureClientEvent } from "./capture-client-event";

export async function signOut() {
  await vanillaRpcClient.auth.signOut();
  captureClientEvent("auth.signed_out");
}
