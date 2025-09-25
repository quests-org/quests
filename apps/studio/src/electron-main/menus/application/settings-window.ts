import { type StudioAppUpdater } from "@/electron-main/lib/update";
import { getSettingsWindow } from "@/electron-main/windows/settings";
import { type MenuItemConstructorOptions } from "electron";

import {
  createAppMenu,
  createEditMenu,
  createHelpMenu,
  createWindowMenu,
} from "./utils";

export function createSettingsWindowMenu(
  appUpdater?: StudioAppUpdater,
): MenuItemConstructorOptions[] {
  const fileMenu: MenuItemConstructorOptions = {
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
  };

  const viewMenu: MenuItemConstructorOptions = {
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
  };

  return [
    createAppMenu(appUpdater),
    fileMenu,
    createEditMenu(),
    viewMenu,
    createWindowMenu(),
    createHelpMenu(),
  ];
}
