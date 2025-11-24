import { publisher } from "@/electron-main/rpc/publisher";
import { getTabsManager } from "@/electron-main/tabs";
import { is } from "@electron-toolkit/utils";
import { type MenuItemConstructorOptions } from "electron";

import {
  createAppMenu,
  createDevToolsMenu,
  createEditMenu,
  createHelpMenu,
  createWindowMenu,
} from "./utils";

export function createMainWindowMenu(): MenuItemConstructorOptions[] {
  const fileMenu: MenuItemConstructorOptions = {
    label: "File",
    submenu: [
      {
        accelerator: "CmdOrCtrl+T",
        click: () => {
          const tabsManager = getTabsManager();
          void tabsManager?.addTab({
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
      {
        accelerator: "CmdOrCtrl+W",
        click: () => {
          const tabsManager = getTabsManager();
          const selectedTabId = tabsManager?.getState().selectedTabId;
          if (selectedTabId) {
            void tabsManager.closeTab({ id: selectedTabId });
          }
        },
        label: "Close Tab",
      },
      { type: "separator" as const },
      {
        accelerator: "CmdOrCtrl+1",
        click: () => {
          const tabsManager = getTabsManager();
          tabsManager?.selectTabByIndex({ index: 0 });
        },
        label: "Switch to Tab 1",
      },
      {
        accelerator: "CmdOrCtrl+2",
        click: () => {
          const tabsManager = getTabsManager();
          tabsManager?.selectTabByIndex({ index: 1 });
        },
        label: "Switch to Tab 2",
      },
      {
        accelerator: "CmdOrCtrl+3",
        click: () => {
          const tabsManager = getTabsManager();
          tabsManager?.selectTabByIndex({ index: 2 });
        },
        label: "Switch to Tab 3",
      },
      {
        accelerator: "CmdOrCtrl+4",
        click: () => {
          const tabsManager = getTabsManager();
          tabsManager?.selectTabByIndex({ index: 3 });
        },
        label: "Switch to Tab 4",
      },
      {
        accelerator: "CmdOrCtrl+5",
        click: () => {
          const tabsManager = getTabsManager();
          tabsManager?.selectTabByIndex({ index: 4 });
        },
        label: "Switch to Tab 5",
      },
      {
        accelerator: "CmdOrCtrl+6",
        click: () => {
          const tabsManager = getTabsManager();
          tabsManager?.selectTabByIndex({ index: 5 });
        },
        label: "Switch to Tab 6",
      },
      {
        accelerator: "CmdOrCtrl+7",
        click: () => {
          const tabsManager = getTabsManager();
          tabsManager?.selectTabByIndex({ index: 6 });
        },
        label: "Switch to Tab 7",
      },
      {
        accelerator: "CmdOrCtrl+8",
        click: () => {
          const tabsManager = getTabsManager();
          tabsManager?.selectTabByIndex({ index: 7 });
        },
        label: "Switch to Tab 8",
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
      },
    ],
  };

  const viewMenu: MenuItemConstructorOptions = {
    label: "View",
    role: "viewMenu" as const,
    submenu: [
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
        label: "Reload App",
      },
      { type: "separator" as const },
      { role: "resetZoom" as const },
      { role: "zoomIn" as const },
      { role: "zoomOut" as const },
      { type: "separator" as const },
      { role: "togglefullscreen" as const },
    ],
  };

  return [
    createAppMenu(),
    fileMenu,
    createEditMenu(),
    viewMenu,
    createWindowMenu(),
    createHelpMenu(),
    ...(is.dev ? createDevToolsMenu() : []),
  ];
}
