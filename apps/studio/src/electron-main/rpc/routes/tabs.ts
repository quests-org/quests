import { base } from "@/electron-main/rpc/base";
import { publisher } from "@/electron-main/rpc/publisher";
import { z } from "zod";

const add = base
  .input(z.object({ select: z.boolean().optional(), urlPath: z.string() }))
  .handler(async ({ context: { tabsManager }, input }) => {
    if (!tabsManager) {
      return false;
    }

    await tabsManager.addTab({ select: input.select, urlPath: input.urlPath });
    return true;
  });

const navigateCurrent = base
  .input(z.object({ urlPath: z.string() }))
  .handler(({ context: { tabsManager }, input }) => {
    if (!tabsManager) {
      return false;
    }

    const existingTab = tabsManager.doesTabExist({ urlPath: input.urlPath });
    if (existingTab) {
      tabsManager.selectTab({ id: existingTab.id });
      return true;
    }

    const currentTab = tabsManager.getCurrentTab();
    if (!currentTab) {
      return false;
    }

    // Use the IPC API on the current tab to navigate to the new URL
    currentTab.webView.webContents.send("navigate", input.urlPath);

    return true;
  });

const navigateCurrentBack = base.handler(({ context }) => {
  context.tabsManager?.goBack();
});

const navigateCurrentForward = base.handler(({ context }) => {
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
  navigateCurrent,
  navigateCurrentBack,
  navigateCurrentForward,
  reorder,
  select,
};
