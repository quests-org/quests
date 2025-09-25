import { type StudioAppUpdater } from "@/electron-main/lib/update";
import { publisher } from "@/electron-main/rpc/publisher";
import { getTabsManager } from "@/electron-main/tabs";
import { openSettingsWindow } from "@/electron-main/windows/settings";
import { is } from "@electron-toolkit/utils";
import { app, type MenuItemConstructorOptions, shell } from "electron";

export function createAppMenu(
  appUpdater?: StudioAppUpdater,
): MenuItemConstructorOptions {
  return {
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
  };
}

export function createDevToolsMenu(): MenuItemConstructorOptions[] {
  if (!is.dev) {
    return [];
  }

  return [
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
  ];
}

export function createEditMenu(): MenuItemConstructorOptions {
  return {
    label: "Edit",
    role: "editMenu" as const,
  };
}

export function createHelpMenu(): MenuItemConstructorOptions {
  return {
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
  };
}

export function createWindowMenu(): MenuItemConstructorOptions {
  return {
    label: "Window",
    role: "windowMenu" as const,
  };
}
