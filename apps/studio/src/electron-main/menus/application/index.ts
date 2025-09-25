import { type StudioAppUpdater } from "@/electron-main/lib/update";
import { publisher } from "@/electron-main/rpc/publisher";
import { app, BrowserWindow, Menu } from "electron";

import { createMainWindowMenu } from "./main-window";
import { createSettingsWindowMenu } from "./settings-window";

export function createApplicationMenu({
  appUpdater,
}: {
  appUpdater?: StudioAppUpdater;
}): void {
  updateApplicationMenu(appUpdater);

  app.on("browser-window-focus", () => {
    updateApplicationMenu(appUpdater);
  });

  void publisher.subscribe("window.focus-changed", () => {
    updateApplicationMenu(appUpdater);
  });
}

function getFocusedWindowType(): "main" | "settings" | null {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) {
    return null;
  }

  return focusedWindow.title === "Settings" ? "settings" : "main";
}

function updateApplicationMenu(appUpdater?: StudioAppUpdater): void {
  const focusedWindowType = getFocusedWindowType();
  const template =
    focusedWindowType === "settings"
      ? createSettingsWindowMenu(appUpdater)
      : createMainWindowMenu(appUpdater);

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
