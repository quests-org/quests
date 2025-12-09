import { client as apiClient } from "@/electron-main/api/client";
import { base } from "@/electron-main/rpc/base";

const get = base.handler(async () => {
  return apiClient.plans.get();
});

export const plans = {
  get,
};
