import { getBackgroundColor } from "@/electron-main/lib/theme-utils";
import { is } from "@electron-toolkit/utils";
import { BrowserWindow, Menu, shell } from "electron";
import path from "node:path";

import { type MainAppPath, mainAppUrl } from "../lib/urls";

let settingsWindow: BrowserWindow | null = null;

export function openSettingsWindow(
  tab?: "Advanced" | "General" | "Providers",
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
  });

  settingsWindow.setBackgroundColor(getBackgroundColor());

  // Handle external links
  settingsWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: "deny" };
  });

  let settingsPath: MainAppPath = "/settings";
  const searchParams = new URLSearchParams();

  if (tab === "Providers") {
    settingsPath = "/settings/providers";
    if (options?.showNewProviderDialog) {
      searchParams.set("showNewProviderDialog", "true");
    }
  } else if (tab === "Advanced") {
    settingsPath = "/settings/advanced";
  }

  const queryString = searchParams.toString();
  const fullUrl =
    mainAppUrl(settingsPath) + (queryString ? `?${queryString}` : "");
  void settingsWindow.loadURL(fullUrl);

  if (is.dev) {
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
