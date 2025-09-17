import { type BrowserWindow } from "electron";

let mainWindow: BrowserWindow | null = null;

export function getMainWindow() {
  return mainWindow;
}

export function setMainWindow(window: BrowserWindow) {
  mainWindow = window;
}
