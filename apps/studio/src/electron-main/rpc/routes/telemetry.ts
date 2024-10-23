import { base } from "@/electron-main/rpc/base";
import { getAppStateStore } from "@/electron-main/stores/app-state";
import { z } from "zod";

const getId = base.output(z.object({ id: z.string() })).handler(() => {
  const appStateStore = getAppStateStore();
  return { id: appStateStore.get("telemetryId") };
});

export const telemetry = {
  getId,
};
