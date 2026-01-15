import { TabsManager } from "@/electron-main/tabs/manager";
import { type BaseWindow } from "electron";

let tabsManager: TabsManager | undefined;

export function createTabsManager({
  baseWindow,
  initialSidebarWidth,
}: {
  baseWindow: BaseWindow;
  initialSidebarWidth: number;
}) {
  tabsManager = new TabsManager({ baseWindow, initialSidebarWidth });

  return tabsManager;
}

export function getTabsManager() {
  return tabsManager;
}
