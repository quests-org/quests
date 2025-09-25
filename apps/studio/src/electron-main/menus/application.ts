import { type StudioAppUpdater } from "@/electron-main/lib/update";
import { publisher } from "@/electron-main/rpc/publisher";
import { getTabsManager } from "@/electron-main/tabs";
import { getMainWindow } from "@/electron-main/windows/main/instance";
import {
  getSettingsWindow,
  openSettingsWindow,
} from "@/electron-main/windows/settings";
import { is } from "@electron-toolkit/utils";
import {
  app,
  BrowserWindow,
  Menu,
  type MenuItemConstructorOptions,
  shell,
} from "electron";

export function createApplicationMenu({
  appUpdater,
}: {
  appUpdater?: StudioAppUpdater;
}): void {
  updateApplicationMenu(appUpdater);

  app.on("browser-window-focus", () => {
    updateApplicationMenu(appUpdater);
  });
}

export function updateApplicationMenu(appUpdater?: StudioAppUpdater): void {
  const template = buildMenuTemplate(appUpdater);
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function buildMenuTemplate(
  appUpdater?: StudioAppUpdater,
): MenuItemConstructorOptions[] {
  const focusedWindowType = getFocusedWindowType();
  const isSettingsWindow = focusedWindowType === "settings";

  const fileMenu = isSettingsWindow
    ? {
        label: "File",
        submenu: [
          {
            accelerator: "CmdOrCtrl+W",
            click: () => {
              const settingsWindow = getSettingsWindow();
              if (settingsWindow && !settingsWindow.isDestroyed()) {
                settingsWindow.close();
              }
            },
            label: "Close Window",
          },
        ],
      }
    : {
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
              // Command+9 typically goes to the last tab
              const state = tabsManager?.getState();
              if (state?.tabs.length) {
                tabsManager?.selectTabByIndex({ index: state.tabs.length - 1 });
              }
            },
            label: "Switch to Last Tab",
          },
        ],
      };

  const viewMenu = isSettingsWindow
    ? {
        label: "View",
        role: "viewMenu" as const,
        submenu: [
          { role: "reload" as const },
          { role: "forceReload" as const },
          { role: "toggleDevTools" as const },
          { type: "separator" as const },
          { role: "resetZoom" as const },
          { role: "zoomIn" as const },
          { role: "zoomOut" as const },
          { type: "separator" as const },
          { role: "togglefullscreen" as const },
        ],
      }
    : {
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
          { role: "reload" as const },
          { role: "forceReload" as const },
          { role: "toggleDevTools" as const },
          { type: "separator" as const },
          { role: "resetZoom" as const },
          { role: "zoomIn" as const },
          { role: "zoomOut" as const },
          { type: "separator" as const },
          { role: "togglefullscreen" as const },
        ],
      };

  return [
    {
      label: app.getName(),
      role: "appMenu" as const,
      submenu: [
        { role: "about" as const },
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
        { role: "services" as const },
        { type: "separator" },
        { role: "hide" as const },
        { role: "hideOthers" as const },
        { role: "unhide" as const },
        { type: "separator" },
        { role: "quit" as const },
      ],
    },
    fileMenu,
    {
      label: "Edit",
      role: "editMenu" as const,
    },
    viewMenu,
    {
      label: "Window",
      role: "windowMenu" as const,
    },
    {
      label: "Help",
      role: "help" as const,
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
                  publisher.publish("test-notification", null);
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
}

function getFocusedWindowType(): "main" | "settings" | null {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) {
    return null;
  }

  const mainWindow = getMainWindow();
  const settingsWindow = getSettingsWindow();

  if (mainWindow && focusedWindow === mainWindow) {
    return "main";
  }
  if (settingsWindow && focusedWindow === settingsWindow) {
    return "settings";
  }

  return null;
}
