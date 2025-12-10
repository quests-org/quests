import { base } from "@/electron-main/rpc/base";
import { publisher } from "@/electron-main/rpc/publisher";
import { type MainAppPath } from "@/shared/main-app-path";
import { z } from "zod";

const AppPathSchema = z.custom<MainAppPath>(
  (value) => typeof value === "string" && value.startsWith("/"),
);

const add = base
  .input(
    z.object({
      appPath: AppPathSchema,
      select: z.boolean().optional(),
    }),
  )
  .handler(async ({ context: { tabsManager }, input }) => {
    if (!tabsManager) {
      return false;
    }

    await tabsManager.addTab({ select: input.select, urlPath: input.appPath });
    return true;
  });

const navigate = base
  .input(z.object({ appPath: AppPathSchema }))
  .handler(({ context: { tabsManager }, input }) => {
    if (!tabsManager) {
      return false;
    }

    const existingTab = tabsManager.doesTabExist({ urlPath: input.appPath });
    if (existingTab) {
      tabsManager.selectTab({ id: existingTab.id });
      return true;
    }

    const currentTab = tabsManager.getCurrentTab();
    if (!currentTab) {
      return false;
    }

    // Use the IPC API on the current tab to navigate to the new URL
    currentTab.webView.webContents.send("navigate", input.appPath);
    // Ensure keyboard focus is on the current tab
    currentTab.webView.webContents.focus();

    return true;
  });

const navigateBack = base.handler(({ context }) => {
  context.tabsManager?.goBack();
});

const navigateForward = base.handler(({ context }) => {
  context.tabsManager?.goForward();
});

const close = base
  .input(z.object({ id: z.string() }))
  .handler(async ({ context, input }) => {
    const { tabsManager } = context;
    if (!tabsManager) {
      return false;
    }

    return tabsManager.closeTab({ id: input.id });
  });

const reorder = base
  .input(z.object({ tabIds: z.array(z.string()) }))
  .handler(({ context, input }) => {
    const { tabsManager } = context;
    if (!tabsManager) {
      return false;
    }

    tabsManager.reorderTabs(input.tabIds);
    return true;
  });

const select = base
  .input(z.object({ id: z.string() }))
  .handler(({ context, input }) => {
    const { tabsManager } = context;
    if (!tabsManager) {
      return false;
    }

    tabsManager.selectTab({ id: input.id });
    return true;
  });

const live = {
  state: base.handler(async function* ({ context, signal }) {
    const currentState = context.tabsManager?.getState();
    yield currentState;

    for await (const payload of publisher.subscribe("tabs.updated", {
      signal,
    })) {
      yield payload ?? undefined;
    }
  }),
};

export const tabs = {
  add,
  close,
  live,
  navigate,
  navigateBack,
  navigateForward,
  reorder,
  select,
};
