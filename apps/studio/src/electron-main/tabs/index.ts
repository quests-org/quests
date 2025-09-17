import { TabsManager } from "@/electron-main/tabs/manager";
import { type BaseWindow } from "electron";

let tabsManager: TabsManager | undefined;

export function createTabsManager({ baseWindow }: { baseWindow: BaseWindow }) {
  tabsManager = new TabsManager({
    baseWindow,
  });

  return tabsManager;
}

export function getTabsManager() {
  return tabsManager;
}
