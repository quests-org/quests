import { type RendererHandlers } from "@/electron-main/handlers/renderer-handlers";
import { TabsManager } from "@/electron-main/tabs/manager";
import { type RendererHandlersCaller } from "@egoist/tipc/main";
import { type BaseWindow } from "electron";

let tabsManager: TabsManager | undefined;

export function createTabsManager({
  baseWindow,
  toolbarRenderHandlers,
}: {
  baseWindow: BaseWindow;
  toolbarRenderHandlers: RendererHandlersCaller<RendererHandlers>;
}) {
  tabsManager = new TabsManager({
    baseWindow,
    toolbarRenderHandlers,
  });

  return tabsManager;
}

export function getTabsManager() {
  return tabsManager;
}
