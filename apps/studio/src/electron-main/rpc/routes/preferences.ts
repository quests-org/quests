import { base } from "@/electron-main/rpc/base";
import { publisher } from "@/electron-main/rpc/publisher";
import {
  getPreferencesStore,
  setLastUpdateCheck,
} from "@/electron-main/stores/preferences";
import { openSettingsWindow as openSettingsWindowFn } from "@/electron-main/windows/settings";
import { app } from "electron";
import { z } from "zod";

function getPreferencesData() {
  const preferencesStore = getPreferencesStore();
  return {
    enableUsageMetrics: preferencesStore.get("enableUsageMetrics") || false,
    lastUpdateCheck: preferencesStore.get("lastUpdateCheck"),
    preferApiKeyOverAccount:
      preferencesStore.get("preferApiKeyOverAccount") || false,
    theme: preferencesStore.get("theme"),
  };
}

const setPreferApiKeyOverAccount = base
  .input(z.object({ prefer: z.boolean() }))
  .handler(({ input }) => {
    const preferencesStore = getPreferencesStore();
    preferencesStore.set("preferApiKeyOverAccount", input.prefer);
  });

const setTheme = base
  .input(z.object({ theme: z.enum(["light", "dark", "system"]) }))
  .handler(({ input }) => {
    const preferencesStore = getPreferencesStore();
    preferencesStore.set("theme", input.theme);
  });

const setEnableUsageMetrics = base
  .input(z.object({ enabled: z.boolean() }))
  .handler(({ input }) => {
    const preferencesStore = getPreferencesStore();
    preferencesStore.set("enableUsageMetrics", input.enabled);
  });

const openSettingsWindow = base
  .input(
    z.object({
      showNewProviderDialog: z.boolean().optional(),
      tab: z
        .enum(["Advanced", "Features", "General", "Providers", "Account"])
        .optional(),
    }),
  )
  .handler(({ input }) => {
    openSettingsWindowFn(input.tab, {
      showNewProviderDialog: input.showNewProviderDialog,
    });
  });

const checkForUpdates = base
  .input(
    z.object({
      notify: z.boolean().optional().default(true),
    }),
  )
  .handler(async ({ context, input }) => {
    setLastUpdateCheck();
    context.workspaceConfig.captureEvent("app.manual_check_for_updates");
    return context.appUpdater.checkForUpdates({ notify: input.notify });
  });

const quitAndInstall = base.handler(({ context }) => {
  context.appUpdater.quitAndInstall();
  return Promise.resolve();
});

const getAppVersion = base.handler(() => {
  return { version: app.getVersion() };
});

const live = {
  get: base.handler(async function* ({ signal }) {
    yield getPreferencesData();

    for await (const _payload of publisher.subscribe("preferences.updated", {
      signal,
    })) {
      yield getPreferencesData();
    }
  }),
};

export const preferences = {
  checkForUpdates,
  getAppVersion,
  live,
  openSettingsWindow,
  quitAndInstall,
  setEnableUsageMetrics,
  setPreferApiKeyOverAccount,
  setTheme,
};
