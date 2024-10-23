import { base } from "@/electron-main/rpc/base";
import { getAppStateStore } from "@/electron-main/stores/app-state";

const get = base.handler(() => {
  const appStateStore = getAppStateStore();
  return {
    hasCompletedProviderSetup: appStateStore.get("hasCompletedProviderSetup"),
  };
});

export const appState = {
  get,
};
