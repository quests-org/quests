import { publisher } from "@/electron-main/rpc/publisher";
import { getTabsManager } from "@/electron-main/tabs";
import { openSettingsWindow } from "@/electron-main/windows/settings";
import { is } from "@electron-toolkit/utils";
import { app, type MenuItemConstructorOptions, shell } from "electron";

export function createAppMenu(): MenuItemConstructorOptions {
  return {
    label: app.getName(),
    role: "appMenu" as const,
    submenu: [
      { role: "about" as const },
      {
        click: () => {
          publisher.publish("updates.start-check", null);
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
            publisher.publish("updates.check-started", null);

            let progress = 0;
            const interval = setInterval(() => {
              progress += 10;

              if (progress <= 100) {
                publisher.publish("updates.download-progress", {
                  progress: {
                    bytesPerSecond: 1024 * 1024,
                    delta: 1024 * 1024,
                    percent: progress,
                    total: 100 * 1024 * 1024,
                    transferred: progress * 1024 * 1024,
                  },
                });
              } else {
                clearInterval(interval);
                publisher.publish("updates.downloaded", {
                  updateInfo: {
                    files: [],
                    path: "",
                    releaseDate: new Date().toISOString(),
                    releaseName: "Test Update",
                    releaseNotes: "This is a test update",
                    sha512: "",
                    version: "1.0.0-test",
                  },
                });
              }
            }, 500);
          },
          label: "Test download notification",
        },
        {
          click: () => {
            const tabsManager = getTabsManager();
            void tabsManager?.addTab({ urlPath: "/setup" });
          },
          label: "Open Setup Tab",
        },
        {
          click: () => {
            publisher.publish("updates.error", {
              error: {
                message: "There was an error checking for updates",
              },
            });
          },
          label: "Test update error notification",
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
