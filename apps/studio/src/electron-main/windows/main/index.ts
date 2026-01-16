import { createContextMenu } from "@/electron-main/lib/context-menu";
import {
  getMainWindowBackgroundColor,
  getTitleBarOverlay,
} from "@/electron-main/lib/theme-utils";
import { studioURL } from "@/electron-main/lib/urls";
import { publisher } from "@/electron-main/rpc/publisher";
import { getSidebarWidth } from "@/electron-main/stores/app-state";
import {
  getWindowState,
  setWindowState,
} from "@/electron-main/stores/window-state";
import { createTabsManager, getTabsManager } from "@/electron-main/tabs";
import {
  getMainWindow,
  setMainWindow,
} from "@/electron-main/windows/main/instance";
import { createToolbar } from "@/electron-main/windows/toolbar";
import { is } from "@electron-toolkit/utils";
import { type BaseWindow, BrowserWindow, shell } from "electron";
import path from "node:path";
import { debounce } from "radashi";

import icon from "../../../../resources/icon.png?asset";

let toolbar: Electron.CrossProcessExports.WebContentsView | null = null;
let wasWindowBlurred = false;

export async function createMainWindow() {
  const mainWindow = new BrowserWindow({
    ...getWindowState().bounds,
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
    try {
      const isMaximized = mainWindow.isMaximized();
      const bounds = mainWindow.getBounds();
      const isNormal =
        !mainWindow.isMaximized() &&
        !mainWindow.isMinimized() &&
        !mainWindow.isFullScreen();

      setWindowState({
        bounds: isNormal ? bounds : getWindowState().bounds,
        isMaximized,
      });
    } catch {
      // Window may be destroyed
    }
  };

  const debouncedSaveState = debounce({ delay: 500 }, saveState);

  mainWindow.on("close", () => {
    const tabsManager = getTabsManager();
    saveState();
    tabsManager?.teardown();
  });

  mainWindow.on("closed", () => {
    saveState();
  });

  mainWindow.on("resize", debouncedSaveState);
  mainWindow.on("move", debouncedSaveState);
  mainWindow.on("blur", () => {
    wasWindowBlurred = true;
  });
  mainWindow.on("focus", () => {
    publisher.publish("window.focus-changed", null);
    // Only focus current tab if the user was away from the app entirely,
    // not when switching between web contents views within the app
    if (wasWindowBlurred) {
      const tabsManager = getTabsManager();
      tabsManager?.focusCurrentTab();
      wasWindowBlurred = false;
    }
  });
  mainWindow.on("ready-to-show", () => {
    const window = getMainWindow();
    if (!window) {
      return;
    }

    showWindow(window);
  });

  const initialSidebarWidth = getSidebarWidth();
  toolbar = createToolbar({ baseWindow: mainWindow, initialSidebarWidth });

  const tabsManager = createTabsManager({
    baseWindow: mainWindow,
    initialSidebarWidth,
  });

  void mainWindow.loadURL(studioURL("/sidebar"));
  mainWindow.contentView.addChildView(toolbar);
  await tabsManager.initialize();
  showWindow(mainWindow);

  if (getWindowState().isMaximized) {
    mainWindow.maximize();
  }

  createContextMenu({
    inspectInNewWindow: true,
    windowOrWebContentsView: mainWindow,
  });

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
