import { publisher } from "@/electron-main/rpc/publisher";
import { isDeveloperMode } from "@/electron-main/stores/preferences";
import { getTabsManager } from "@/electron-main/tabs";
import { type MenuItemConstructorOptions } from "electron";

import { captureServerEvent } from "../lib/capture-server-event";
import { getSidebarVisible, setSidebarVisible } from "../stores/app-state";
import {
  createAppMenu,
  createDevToolsMenu,
  createEditMenu,
  createHelpMenu,
} from "./utils";

export function createMainWindowMenu(): MenuItemConstructorOptions[] {
  const fileMenu: MenuItemConstructorOptions = {
    label: "File",
    submenu: [
      {
        accelerator: "CmdOrCtrl+T",
        click: () => {
          const tabsManager = getTabsManager();
          tabsManager?.addTab({
            urlPath: "/new-tab",
          });
        },
        label: "New Tab",
      },
      {
        accelerator: "CmdOrCtrl+N",
        click: () => {
          const tabsManager = getTabsManager();
          const currentTab = tabsManager?.getCurrentTab();
          if (currentTab) {
            currentTab.webView.webContents.send("navigate", "/new-tab");
            currentTab.webView.webContents.focus();
          }
        },
        label: "New Project",
      },
      { type: "separator" as const },
      {
        accelerator: "CmdOrCtrl+W",
        click: () => {
          const tabsManager = getTabsManager();
          const selectedTabId = tabsManager?.getState().selectedTabId;
          if (selectedTabId) {
            tabsManager.closeTab({ id: selectedTabId });
          }
        },
        label: "Close Tab",
      },
      {
        accelerator: "CmdOrCtrl+Shift+T",
        click: () => {
          const tabsManager = getTabsManager();
          tabsManager?.reopenClosedTab();
        },
        label: "Reopen Closed Tab",
      },
    ],
  };

  const viewMenu: MenuItemConstructorOptions = {
    label: "View",
    role: "viewMenu" as const,
    submenu: [
      {
        accelerator: "CmdOrCtrl+K",
        click: () => {
          const tabsManager = getTabsManager();
          const currentTab = tabsManager?.getCurrentTab();
          if (currentTab) {
            publisher.publish("app.toggle-command-menu", {
              webContentsId: currentTab.webView.webContents.id,
            });
            tabsManager?.focusCurrentTab();
          }
        },
        label: "Show Command Menu",
      },
      { type: "separator" as const },
      {
        accelerator: "CmdOrCtrl+[",
        click: () => {
          const tabsManager = getTabsManager();
          tabsManager?.goBack();
        },
        label: "Back",
      },
      {
        accelerator: "CmdOrCtrl+]",
        click: () => {
          const tabsManager = getTabsManager();
          tabsManager?.goForward();
        },
        label: "Forward",
      },
      { type: "separator" as const },
      {
        accelerator: "CmdOrCtrl+R",
        click: () => {
          const tabsManager = getTabsManager();
          const currentTab = tabsManager?.getCurrentTab();
          if (currentTab) {
            publisher.publish("app.reload", {
              webContentsId: currentTab.webView.webContents.id,
            });
          }
        },
        label: "Reload Page",
      },
      { type: "separator" as const },
      {
        accelerator: "CmdOrCtrl+B",
        click: () => {
          const wasVisible = getSidebarVisible();
          setSidebarVisible(!wasVisible);
          captureServerEvent(
            wasVisible ? "app.sidebar_closed" : "app.sidebar_opened",
          );
        },
        label: getSidebarVisible() ? "Hide Sidebar" : "Show Sidebar",
      },
      { type: "separator" as const },
      { role: "togglefullscreen" as const },
    ],
  };

  const windowMenu: MenuItemConstructorOptions = {
    label: "Window",
    role: "windowMenu" as const,
    submenu: [
      {
        accelerator: "CmdOrCtrl+0",
        click: () => {
          // Zoom is applied to the tab view only. The sidebar and tab bar use
          // fixed pixel sizes and break if zoomed.
          getTabsManager()?.resetZoom();
        },
        label: "Actual Size",
      },
      {
        accelerator: "CmdOrCtrl+Plus",
        click: () => {
          getTabsManager()?.zoomIn();
        },
        label: "Zoom In",
      },
      {
        accelerator: "CmdOrCtrl+-",
        click: () => {
          getTabsManager()?.zoomOut();
        },
        label: "Zoom Out",
      },
      { type: "separator" as const },
      {
        accelerator: "Ctrl+Tab",
        click: () => {
          getTabsManager()?.selectNextTab();
        },
        label: "Show Next Tab",
      },
      {
        accelerator: "Ctrl+Shift+Tab",
        click: () => {
          getTabsManager()?.selectPreviousTab();
        },
        label: "Show Previous Tab",
      },
      {
        accelerator: "CmdOrCtrl+Shift+]",
        click: () => {
          getTabsManager()?.selectNextTab();
        },
        label: "Show Next Tab",
        visible: false,
      },
      {
        accelerator: "CmdOrCtrl+Shift+[",
        click: () => {
          getTabsManager()?.selectPreviousTab();
        },
        label: "Show Previous Tab",
        visible: false,
      },
      { type: "separator" as const },
      { role: "minimize" as const },
      { role: "zoom" as const },
      { type: "separator" as const },
      { role: "front" as const },
      {
        accelerator: "CmdOrCtrl+1",
        click: () => {
          const tabsManager = getTabsManager();
          tabsManager?.selectTabByIndex({ index: 0 });
        },
        label: "Switch to Tab 1",
        visible: false,
      },
      {
        accelerator: "CmdOrCtrl+2",
        click: () => {
          const tabsManager = getTabsManager();
          tabsManager?.selectTabByIndex({ index: 1 });
        },
        label: "Switch to Tab 2",
        visible: false,
      },
      {
        accelerator: "CmdOrCtrl+3",
        click: () => {
          const tabsManager = getTabsManager();
          tabsManager?.selectTabByIndex({ index: 2 });
        },
        label: "Switch to Tab 3",
        visible: false,
      },
      {
        accelerator: "CmdOrCtrl+4",
        click: () => {
          const tabsManager = getTabsManager();
          tabsManager?.selectTabByIndex({ index: 3 });
        },
        label: "Switch to Tab 4",
        visible: false,
      },
      {
        accelerator: "CmdOrCtrl+5",
        click: () => {
          const tabsManager = getTabsManager();
          tabsManager?.selectTabByIndex({ index: 4 });
        },
        label: "Switch to Tab 5",
        visible: false,
      },
      {
        accelerator: "CmdOrCtrl+6",
        click: () => {
          const tabsManager = getTabsManager();
          tabsManager?.selectTabByIndex({ index: 5 });
        },
        label: "Switch to Tab 6",
        visible: false,
      },
      {
        accelerator: "CmdOrCtrl+7",
        click: () => {
          const tabsManager = getTabsManager();
          tabsManager?.selectTabByIndex({ index: 6 });
        },
        label: "Switch to Tab 7",
        visible: false,
      },
      {
        accelerator: "CmdOrCtrl+8",
        click: () => {
          const tabsManager = getTabsManager();
          tabsManager?.selectTabByIndex({ index: 7 });
        },
        label: "Switch to Tab 8",
        visible: false,
      },
      {
        accelerator: "CmdOrCtrl+9",
        click: () => {
          const tabsManager = getTabsManager();
          const state = tabsManager?.getState();
          if (state?.tabs.length) {
            tabsManager?.selectTabByIndex({ index: state.tabs.length - 1 });
          }
        },
        label: "Switch to Last Tab",
        visible: false,
      },
    ],
  };

  return [
    createAppMenu(),
    fileMenu,
    createEditMenu(),
    viewMenu,
    windowMenu,
    createHelpMenu(),
    ...(isDeveloperMode() ? createDevToolsMenu() : []),
  ];
}
