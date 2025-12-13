import { vanillaAPIRPCClient } from "@/electron-main/api/client";
import { base } from "@/electron-main/rpc/base";

const get = base.handler(async () => {
  return vanillaAPIRPCClient.plans.get();
});

export const plans = {
  get,
};
