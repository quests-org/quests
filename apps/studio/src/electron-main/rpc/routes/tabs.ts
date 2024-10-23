import { base } from "@/electron-main/rpc/base";
import { z } from "zod";

const add = base
  .input(z.object({ urlPath: z.string() }))
  .handler(async ({ context: { tabsManager }, input }) => {
    if (!tabsManager) {
      return false;
    }

    await tabsManager.addTab({ urlPath: input.urlPath });
    return true;
  });

const navigateCurrent = base
  .input(z.object({ urlPath: z.string() }))
  .handler(({ context: { tabsManager }, input }) => {
    if (!tabsManager) {
      return false;
    }

    // Find the currently selected tab
    const currentTab = tabsManager.getCurrentTab();
    if (!currentTab) {
      return false;
    }

    // Use the IPC API on the current tab to navigate to the new URL
    currentTab.webView.webContents.send("navigate", input.urlPath);

    return true;
  });

const navigateCurrentBack = base.handler(({ context }) => {
  const currentTab = context.tabsManager?.getCurrentTab();
  if (!currentTab) {
    return false;
  }

  currentTab.webView.webContents.send("history-back");
  return true;
});

const navigateCurrentForward = base.handler(({ context }) => {
  const currentTab = context.tabsManager?.getCurrentTab();
  if (!currentTab) {
    return false;
  }

  currentTab.webView.webContents.send("history-forward");
  return true;
});

const doesExist = base
  .input(z.object({ urlPath: z.string() }))
  .handler(({ context, input }) => {
    const { tabsManager } = context;
    if (!tabsManager) {
      return false;
    }

    return tabsManager.doesTabExist({ urlPath: input.urlPath });
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

const getState = base.handler(({ context }) => {
  const { tabsManager } = context;
  if (!tabsManager) {
    return null;
  }

  return tabsManager.getState();
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

export const tabs = {
  add,
  close,
  doesExist,
  getState,
  navigateCurrent,
  navigateCurrentBack,
  navigateCurrentForward,
  reorder,
  select,
};
