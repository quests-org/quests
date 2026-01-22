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
import { createToolbar, resizeToolbar } from "@/electron-main/windows/toolbar";
import { is } from "@electron-toolkit/utils";
import { type BaseWindow, BrowserWindow } from "electron";
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
  const debouncedResizeViews = debounce({ delay: 100 }, resizeViews);

  mainWindow.on("close", () => {
    const tabsManager = getTabsManager();
    debouncedSaveState.cancel();
    debouncedResizeViews.cancel();
    saveState();
    tabsManager?.teardown();
  });

  mainWindow.on("closed", () => {
    debouncedSaveState.cancel();
    debouncedResizeViews.cancel();
    saveState();
  });

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

  setupWindowEventListeners({
    mainWindow,
    onResize: () => {
      debouncedSaveState();
      debouncedResizeViews();
    },
  });

  createContextMenu({
    inspectInNewWindow: true,
    windowOrWebContentsView: mainWindow,
  });

  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });

  // Required or the initial size may be wrong
  debouncedResizeViews();

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

function resizeViews() {
  const tabsManager = getTabsManager();
  tabsManager?.updateCurrentTabBounds();
  resizeToolbar();
}

function setupWindowEventListeners({
  mainWindow,
  onResize,
}: {
  mainWindow: BrowserWindow;
  onResize: () => void;
}) {
  // Required on macOS and Linux
  // On macoS, unfocused resizes (e.g. Amethyst) won't be tracked
  // On Linux, maximize / unmaximize may not fire reliably
  mainWindow.on("will-resize", () => {
    onResize();
  });
  mainWindow.on("resize", () => {
    onResize();
  });
  mainWindow.on("move", () => {
    onResize();
  });

  // These were added when fixing Linux and may not be needed
  mainWindow.on("maximize", () => {
    onResize();
  });
  // cspell:ignore unmaximize
  mainWindow.on("unmaximize", () => {
    onResize();
  });
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
