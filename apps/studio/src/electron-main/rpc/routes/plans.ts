import { apiQueryClient, apiRPCClient } from "@/electron-main/api/client";
import { base } from "@/electron-main/rpc/base";

const get = base.handler(async () => {
  return apiQueryClient.fetchQuery(apiRPCClient.plans.get.queryOptions());
});

export const plans = {
  get,
};
