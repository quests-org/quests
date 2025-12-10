import { getBackgroundColor } from "@/electron-main/lib/theme-utils";
import { publisher } from "@/electron-main/rpc/publisher";
import { type MainAppPath } from "@/shared/main-app-path";
import { BrowserWindow, Menu, shell } from "electron";
import path from "node:path";

import { mainAppUrl } from "../lib/urls";
import { isDeveloperMode } from "../stores/preferences";

let settingsWindow: BrowserWindow | null = null;

export function getSettingsWindow(): BrowserWindow | null {
  return settingsWindow;
}

export function openSettingsWindow(
  tab?: "Advanced" | "Features" | "General" | "Providers",
  options?: { showNewProviderDialog?: boolean },
) {
  // If settings window already exists, focus it
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  // Create new settings window with minimal configuration
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

  // Show window when ready
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

  let settingsPath: MainAppPath = "/settings";
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
    mainAppUrl(settingsPath) + (queryString ? `?${queryString}` : "");
  void settingsWindow.loadURL(fullUrl);

  if (isDeveloperMode()) {
    settingsWindow.webContents.on("context-menu", (_, props) => {
      const menu = Menu.buildFromTemplate([
        {
          click: () => {
            settingsWindow?.webContents.inspectElement(props.x, props.y);
          },
          label: "Inspect Element",
        },
      ]);
      menu.popup({ window: settingsWindow ?? undefined });
    });
  }
}
