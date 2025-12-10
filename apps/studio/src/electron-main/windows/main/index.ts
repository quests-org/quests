import { logger } from "@/electron-main/lib/electron-logger";
import {
  getMainWindowBackgroundColor,
  getTitleBarOverlay,
} from "@/electron-main/lib/theme-utils";
import { mainAppUrl } from "@/electron-main/lib/urls";
import { onMainWindowContextMenu } from "@/electron-main/menus/context-menus";
import { publisher } from "@/electron-main/rpc/publisher";
import { windowStateStore } from "@/electron-main/stores/main-window";
import { isDeveloperMode } from "@/electron-main/stores/preferences";
import { createTabsManager, getTabsManager } from "@/electron-main/tabs";
import {
  getMainWindow,
  setMainWindow,
} from "@/electron-main/windows/main/instance";
import { createToolbar } from "@/electron-main/windows/toolbar";
import { is } from "@electron-toolkit/utils";
import { type BaseWindow, BrowserWindow, shell } from "electron";
import path from "node:path";

import icon from "../../../../resources/icon.png?asset";

let toolbar: Electron.CrossProcessExports.WebContentsView | null = null;

export async function createMainWindow() {
  const boundsState = windowStateStore.get("bounds");

  const mainWindow = new BrowserWindow({
    ...boundsState,
    show: false,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    trafficLightPosition: { x: 12, y: 12 },
    ...(process.platform === "linux" ? { icon } : {}),
    backgroundColor: getMainWindowBackgroundColor(),
    frame: false,
    titleBarOverlay: getTitleBarOverlay(),
    vibrancy: "sidebar",
    visualEffectState: "active",
    webPreferences: {
      contextIsolation: true,
      preload: path.join(import.meta.dirname, "../preload/index.mjs"),
      sandbox: false,
    },
  });

  setMainWindow(mainWindow);

  const saveState = () => {
    const isMaximized = mainWindow.isMaximized();
    const bounds = mainWindow.getBounds();

    windowStateStore.set({
      bounds: isMaximized ? windowStateStore.get("bounds") : bounds,
      isMaximized,
    });
  };

  mainWindow.on("close", () => {
    const tabsManager = getTabsManager();
    saveState();
    tabsManager?.teardown();
  });

  mainWindow.on("resize", saveState);
  mainWindow.on("move", saveState);
  mainWindow.on("focus", () => {
    publisher.publish("window.focus-changed", null);
  });
  mainWindow.on("ready-to-show", () => {
    const window = getMainWindow();
    if (!window) {
      return;
    }

    showWindow(window);
  });

  toolbar = await createToolbar({ baseWindow: mainWindow });

  const tabsManager = createTabsManager({
    baseWindow: mainWindow,
  });

  if (toolbar === null) {
    logger.error("Failed to load toolbar or mainContent");
    return;
  }

  void mainWindow.loadURL(mainAppUrl("/sidebar"));
  mainWindow.contentView.addChildView(toolbar);
  await tabsManager.initialize();
  showWindow(mainWindow);

  if (windowStateStore.get("isMaximized")) {
    mainWindow.maximize();
  }

  if (isDeveloperMode()) {
    mainWindow.webContents.on("context-menu", (_, props) => {
      const window = getMainWindow();
      if (!window) {
        return;
      }

      onMainWindowContextMenu(window, props);
    });
  }

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: "deny" };
  });

  return mainWindow;
}

export function updateTitleBarOverlay() {
  const window = getMainWindow();
  if (
    window &&
    !window.isDestroyed() &&
    (process.platform === "linux" || process.platform === "win32")
  ) {
    window.setTitleBarOverlay(getTitleBarOverlay());
  }
}

function showWindow(baseWindow: BaseWindow) {
  if (!baseWindow.isVisible()) {
    if (is.dev) {
      // Prevents the window from gaining focus every time it reloads in dev
      baseWindow.showInactive();
    } else {
      baseWindow.show();
    }
  }
}
