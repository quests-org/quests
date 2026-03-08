import { createContextMenu } from "@/electron-main/lib/context-menu";
import { openExternal } from "@/electron-main/lib/open-external";
import { TOOLBAR_HEIGHT } from "@/shared/constants";
import { type BaseWindow, WebContentsView } from "electron";
import path from "node:path";

import { studioURL } from "../lib/urls";

let toolbarView: null | WebContentsView = null;
let toolbarBaseWindow: BaseWindow | null = null;

export function createToolbar({ baseWindow }: { baseWindow: BaseWindow }) {
  if (toolbarView !== null) {
    return toolbarView;
  }

  toolbarBaseWindow = baseWindow;

  toolbarView = new WebContentsView({
    webPreferences: {
      preload: path.join(import.meta.dirname, "../preload/index.mjs"),
      sandbox: false,
    },
  });

  // Transparent so the sidebar's vibrancy/background shows through on macOS
  // when the toolbar overlaps the sidebar area.
  toolbarView.setBackgroundColor("#00000000");

  toolbarView.webContents.setWindowOpenHandler((details) => {
    void openExternal(details.url);
    return { action: "deny" };
  });

  createContextMenu({
    inspectInNewWindow: true,
    windowOrWebContentsView: toolbarView,
  });

  resizeToolbar();

  void toolbarView.webContents.loadURL(studioURL("/toolbar"));

  return toolbarView;
}

export function getToolbarView() {
  return toolbarView;
}

export function resizeToolbar() {
  if (toolbarView === null || toolbarBaseWindow === null) {
    return;
  }
  // Using getContentBounds due to this being a frameless window. getBounds()
  // returns the incorrect bounds on Windows when in maximized state.
  const newBounds = toolbarBaseWindow.getContentBounds();
  toolbarView.setBounds({
    height: TOOLBAR_HEIGHT,
    width: newBounds.width,
    x: 0,
    y: 0,
  });
}
