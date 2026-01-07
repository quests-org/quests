import { type WorkspaceConfig } from "@quests/workspace/electron";

import { publisher } from "../rpc/publisher";
import { type TabsManager } from "../tabs/manager";
import { getMainWindow } from "../windows/main/instance";
import { getToolbarView } from "../windows/toolbar";

const sidebarWidth = 250;
const toolbarHeight = 40;
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

function updateToolbarForSidebarChange() {
  const toolbarView = getToolbarView();
  if (toolbarView) {
    const baseWindow = getMainWindow();
    // Using getContentBounds due to this being a frameless window. getBounds()
    // returns the incorrect bounds on Windows when in maximized state.
    const bounds = baseWindow?.getContentBounds();

    if (!bounds) {
      return;
    }

    const currentSidebarWidth = getSidebarWidth();
    toolbarView.setBounds({
      height: toolbarHeight,
      width: bounds.width - currentSidebarWidth,
      x: currentSidebarWidth,
      y: 0,
    });
  }
}
