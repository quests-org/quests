import { publisher } from "@/electron-main/rpc/publisher";
import { app, BrowserWindow, Menu } from "electron";

import { createMainWindowMenu } from "./main-window";
import { createSettingsWindowMenu } from "./settings-window";

export function createApplicationMenu(): void {
  updateApplicationMenu();

  app.on("browser-window-focus", () => {
    updateApplicationMenu();
  });

  void publisher.subscribe("window.focus-changed", () => {
    updateApplicationMenu();
  });

  void publisher.subscribe("sidebar.visibility-updated", () => {
    updateApplicationMenu();
  });
}

function getFocusedWindowType(): "main" | "settings" | null {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) {
    return null;
  }

  return focusedWindow.title === "Settings" ? "settings" : "main";
}

function updateApplicationMenu(): void {
  const focusedWindowType = getFocusedWindowType();
  const template =
    focusedWindowType === "settings"
      ? createSettingsWindowMenu()
      : createMainWindowMenu();

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
