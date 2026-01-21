import { createContextMenu } from "@/electron-main/lib/context-menu";
import { TOOLBAR_HEIGHT } from "@/shared/constants";
import { type BaseWindow, shell, WebContentsView } from "electron";
import path from "node:path";
import { debounce } from "radashi";

import { getBackgroundColor } from "../lib/theme-utils";
import { studioURL } from "../lib/urls";
import { publisher } from "../rpc/publisher";

let toolbarView: null | WebContentsView = null;

export function createToolbar({
  baseWindow,
  initialSidebarWidth,
}: {
  baseWindow: BaseWindow;
  initialSidebarWidth: number;
}) {
  if (toolbarView !== null) {
    return toolbarView;
  }

  toolbarView = new WebContentsView({
    webPreferences: {
      preload: path.join(import.meta.dirname, "../preload/index.mjs"),
      sandbox: false,
    },
  });

  toolbarView.setBackgroundColor(getBackgroundColor());

  toolbarView.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: "deny" };
  });

  createContextMenu({
    inspectInNewWindow: true,
    windowOrWebContentsView: toolbarView,
  });

  let currentSidebarWidth = initialSidebarWidth;
  resizeToolbar({ baseWindow, sidebarWidth: currentSidebarWidth });
  void publisher.subscribe("sidebar.updated", ({ width }) => {
    currentSidebarWidth = width;
    resizeToolbar({ baseWindow, sidebarWidth: currentSidebarWidth });
  });

  const debouncedResize = debounce({ delay: 100 }, () => {
    resizeToolbar({ baseWindow, sidebarWidth: currentSidebarWidth });
  });

  baseWindow.on("resize", debouncedResize);
  // Required on macOS, or unfocused resizes (e.g. Amethyst) won't be tracked
  baseWindow.on("will-resize", debouncedResize);
  // Required for double clicking window edge style resize
  baseWindow.on("move", debouncedResize);
  // Required for maximize/unmaximize on all platforms (resize may not fire reliably)
  baseWindow.on("maximize", debouncedResize);
  // cspell:ignore unmaximize
  baseWindow.on("unmaximize", debouncedResize);

  baseWindow.on("close", () => {
    // Avoids errors when accessing destroyed window
    debouncedResize.cancel();
  });

  void toolbarView.webContents.loadURL(studioURL("/toolbar"));

  return toolbarView;
}

export function getToolbarView() {
  return toolbarView;
}

function resizeToolbar({
  baseWindow,
  sidebarWidth,
}: {
  baseWindow: BaseWindow;
  sidebarWidth: number;
}) {
  // Using getContentBounds due to this being a frameless window. getBounds()
  // returns the incorrect bounds on Windows when in maximized state.
  const newBounds = baseWindow.getContentBounds();
  if (toolbarView === null) {
    return;
  }
  toolbarView.setBounds({
    height: TOOLBAR_HEIGHT,
    width: newBounds.width - sidebarWidth,
    x: sidebarWidth,
    y: 0,
  });
}
