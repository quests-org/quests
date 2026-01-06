import { type WorkspaceConfig } from "@quests/workspace/electron";

import { publisher } from "../rpc/publisher";
import { type TabsManager } from "../tabs/manager";
import { updateToolbarForSidebarChange } from "../windows/toolbar";

const sidebarWidth = 250;
let sidebarVisible = true;

export function getSidebarVisible() {
  return sidebarVisible;
}

export function getSidebarWidth() {
  return sidebarVisible ? sidebarWidth : 0;
}

export function setSidebarVisible({
  tabsManager,
  visible,
  workspaceConfig,
}: {
  tabsManager?: TabsManager;
  visible: boolean;
  workspaceConfig?: WorkspaceConfig;
}) {
  if (visible) {
    showSidebar();
  } else {
    hideSidebar();
  }

  updateToolbarForSidebarChange();
  tabsManager?.updateTabsForSidebarChange();

  publisher.publish("sidebar.visibility-updated", { visible });

  if (workspaceConfig) {
    workspaceConfig.captureEvent(
      visible ? "app.sidebar_opened" : "app.sidebar_closed",
    );
  }

  tabsManager?.focusCurrentTab();
}

export function toggleSidebar({
  tabsManager,
  workspaceConfig,
}: {
  tabsManager?: TabsManager;
  workspaceConfig?: WorkspaceConfig;
}) {
  const newVisibility = !getSidebarVisible();
  setSidebarVisible({ tabsManager, visible: newVisibility, workspaceConfig });
}

function hideSidebar() {
  sidebarVisible = false;
}

function showSidebar() {
  sidebarVisible = true;
}
