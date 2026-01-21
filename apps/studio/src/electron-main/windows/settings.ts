import { createContextMenu } from "@/electron-main/lib/context-menu";
import { getBackgroundColor } from "@/electron-main/lib/theme-utils";
import { publisher } from "@/electron-main/rpc/publisher";
import { type StudioPath } from "@/shared/studio-path";
import { BrowserWindow, shell } from "electron";
import path from "node:path";

import { studioURL } from "../lib/urls";

let settingsWindow: BrowserWindow | null = null;

export function getSettingsWindow(): BrowserWindow | null {
  return settingsWindow;
}

export function openSettingsWindow(
  tab?: "Advanced" | "Features" | "General" | "Providers",
  options?: { showNewProviderDialog?: boolean },
) {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    autoHideMenuBar: true,
    backgroundColor: getBackgroundColor(),
    height: 700,
    minHeight: 500,
    minWidth: 600,
    show: false,
    title: "Settings",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      contextIsolation: true,
      preload: path.join(import.meta.dirname, "../preload/index.mjs"),
      sandbox: false,
    },
    width: 900,
  });

  settingsWindow.once("ready-to-show", () => {
    settingsWindow?.show();
  });

  settingsWindow.on("closed", () => {
    settingsWindow = null;
    publisher.publish("window.focus-changed", null);
  });

  settingsWindow.on("focus", () => {
    publisher.publish("window.focus-changed", null);
  });

  settingsWindow.setBackgroundColor(getBackgroundColor());

  // Handle external links
  settingsWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: "deny" };
  });

  let settingsPath: StudioPath = "/settings";
  const searchParams = new URLSearchParams();

  switch (tab) {
    case "Advanced": {
      settingsPath = "/settings/advanced";
      break;
    }
    case "Features": {
      settingsPath = "/settings/features";
      break;
    }
    case "Providers": {
      settingsPath = "/settings/providers";
      if (options?.showNewProviderDialog) {
        searchParams.set("showNewProviderDialog", "true");
      }
      break;
    }
    // No default
  }

  const queryString = searchParams.toString();
  const fullUrl =
    studioURL(settingsPath) + (queryString ? `?${queryString}` : "");
  void settingsWindow.loadURL(fullUrl);

  createContextMenu({ windowOrWebContentsView: settingsWindow });
}
