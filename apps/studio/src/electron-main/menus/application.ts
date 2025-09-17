import { type RendererHandlers } from "@/electron-main/handlers/renderer-handlers";
import { type StudioAppUpdater } from "@/electron-main/lib/update";
import { getTabsManager } from "@/electron-main/tabs";
import { openSettingsWindow } from "@/electron-main/windows/settings";
import { type RendererHandlersCaller } from "@egoist/tipc/main";
import { is } from "@electron-toolkit/utils";
import { app, Menu, type MenuItemConstructorOptions, shell } from "electron";

export function createApplicationMenu({
  appUpdater,
  renderHandlersProxy,
}: {
  appUpdater?: StudioAppUpdater;
  renderHandlersProxy: RendererHandlersCaller<RendererHandlers>;
}): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: app.getName(),
      role: "appMenu",
      submenu: [
        { role: "about" },
        {
          click: () => {
            void appUpdater?.checkForUpdates({ notify: true });
          },
          label: "Check for Updates...",
        },
        { type: "separator" },
        {
          accelerator: "CmdOrCtrl+,",
          click: () => {
            openSettingsWindow();
          },
          label: "Settings...",
        },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
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
        { type: "separator" },
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
            // Command+9 typically goes to the last tab
            const state = tabsManager?.getState();
            if (state?.tabs.length) {
              tabsManager?.selectTabByIndex({ index: state.tabs.length - 1 });
            }
          },
          label: "Switch to Last Tab",
        },
      ],
    },
    {
      label: "Edit",
      role: "editMenu",
    },
    {
      label: "View",
      role: "viewMenu",
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
        { type: "separator" },
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      role: "windowMenu",
    },
    {
      label: "Help",
      role: "help",
      submenu: [
        {
          click: () => {
            void shell.openExternal("https://quests.dev");
          },
          label: "Learn More",
        },
      ],
    },
    ...(is.dev
      ? [
          {
            label: "Dev Tools",
            submenu: [
              {
                click: () => {
                  renderHandlersProxy.testNotification.send();
                },
                label: "Send test notification",
              },
              {
                click: () => {
                  const tabsManager = getTabsManager();
                  void tabsManager?.addTab({ urlPath: "/setup" });
                },
                label: "Open Setup Tab",
              },
            ],
          },
        ]
      : []),
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
