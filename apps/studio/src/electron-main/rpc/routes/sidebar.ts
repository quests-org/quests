import {
  getSidebarVisible,
  hideSidebar,
  showSidebar,
} from "@/electron-main/lib/sidebar";
import { base } from "@/electron-main/rpc/base";
import { publisher } from "@/electron-main/rpc/publisher";
import { updateToolbarForSidebarChange } from "@/electron-main/windows/toolbar";

const close = base.handler(({ context }) => {
  hideSidebar();
  updateToolbarForSidebarChange();
  context.tabsManager?.updateTabsForSidebarChange();

  const sidebarVisibilityPayload = { visible: false };

  publisher.publish("sidebar.visibility-updated", sidebarVisibilityPayload);

  context.workspaceConfig.captureEvent("app.sidebar_closed");

  context.tabsManager?.focusCurrentTab();

  return true;
});

const open = base.handler(({ context }) => {
  showSidebar();
  updateToolbarForSidebarChange();
  context.tabsManager?.updateTabsForSidebarChange();

  const sidebarVisibilityPayload = { visible: true };

  publisher.publish("sidebar.visibility-updated", sidebarVisibilityPayload);

  context.workspaceConfig.captureEvent("app.sidebar_opened");

  context.tabsManager?.focusCurrentTab();

  return true;
});

const live = {
  visibility: base.handler(async function* ({ signal }) {
    // Yield current state
    yield { visible: getSidebarVisible() };

    // Subscribe to changes
    for await (const payload of publisher.subscribe(
      "sidebar.visibility-updated",
      { signal },
    )) {
      yield payload;
    }
  }),
};

export const sidebar = {
  close,
  live,
  open,
};
