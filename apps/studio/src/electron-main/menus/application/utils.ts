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
          publisher.publish("updates.trigger-check", null);
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
          label: "Pages",
          submenu: [
            {
              click: () => {
                const tabsManager = getTabsManager();
                void tabsManager?.addTab({ urlPath: "/setup" });
              },
              label: "/setup",
            },
            {
              click: () => {
                const tabsManager = getTabsManager();
                void tabsManager?.addTab({ urlPath: "/welcome" });
              },
              label: "/welcome",
            },
            {
              click: () => {
                publisher.publish("debug.open-debug-page", null);
              },
              label: "/debug",
            },
          ],
        },
        { type: "separator" },
        {
          click: () => {
            publisher.publish("debug.open-router-devtools", null);
          },
          label: "Router DevTools",
        },
        {
          click: () => {
            publisher.publish("debug.open-query-devtools", null);
          },
          label: "Query DevTools",
        },
        {
          click: () => {
            publisher.publish("debug.open-analytics-toolbar", null);
          },
          label: "Analytics Toolbar",
        },
        { type: "separator" },
        {
          click: () => {
            publisher.publish("test-notification", null);
          },
          label: "Send test notification",
        },
        {
          click: () => {
            publisher.publish("updates.status", {
              status: { notifyUser: true, type: "checking" },
            });

            let progress = 0;
            const interval = setInterval(() => {
              progress += 10;

              if (progress <= 100) {
                publisher.publish("updates.status", {
                  status: {
                    notifyUser: true,
                    progress: {
                      bytesPerSecond: 1024 * 1024,
                      delta: 1024 * 1024,
                      percent: progress,
                      total: 100 * 1024 * 1024,
                      transferred: progress * 1024 * 1024,
                    },
                    type: "downloading",
                  },
                });
              } else {
                clearInterval(interval);
                publisher.publish("updates.status", {
                  status: {
                    notifyUser: true,
                    type: "downloaded",
                    updateInfo: {
                      files: [],
                      path: "",
                      releaseDate: new Date().toISOString(),
                      releaseName: "Test Update",
                      releaseNotes: "This is a test update",
                      sha512: "",
                      version: "1.0.0-test",
                    },
                  },
                });
              }
            }, 500);
          },
          label: "Test download notification",
        },
        {
          click: () => {
            publisher.publish("updates.status", {
              status: { notifyUser: true, type: "checking" },
            });

            void new Promise((resolve) => setTimeout(resolve, 1000)).then(
              () => {
                publisher.publish("updates.status", {
                  status: {
                    message: "There was an error checking for updates",
                    notifyUser: true,
                    type: "error",
                  },
                });
              },
            );
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
