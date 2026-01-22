import { createContextMenu } from "@/electron-main/lib/context-menu";
import { TOOLBAR_HEIGHT } from "@/shared/constants";
import { type BaseWindow, WebContentsView } from "electron";
import path from "node:path";

import { getBackgroundColor } from "../lib/theme-utils";
import { studioURL } from "../lib/urls";
import { publisher } from "../rpc/publisher";

let toolbarView: null | WebContentsView = null;
let toolbarBaseWindow: BaseWindow | null = null;
let toolbarSidebarWidth = 0;

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

  toolbarBaseWindow = baseWindow;
  toolbarSidebarWidth = initialSidebarWidth;

  toolbarView = new WebContentsView({
    webPreferences: {
      preload: path.join(import.meta.dirname, "../preload/index.mjs"),
      sandbox: false,
    },
  });

  toolbarView.setBackgroundColor(getBackgroundColor());

  toolbarView.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });

  createContextMenu({
    inspectInNewWindow: true,
    windowOrWebContentsView: toolbarView,
  });

  resizeToolbarInternal();
  void publisher.subscribe("sidebar.updated", ({ width }) => {
    toolbarSidebarWidth = width;
    resizeToolbarInternal();
  });

  void toolbarView.webContents.loadURL(studioURL("/toolbar"));

  return toolbarView;
}

export function getToolbarView() {
  return toolbarView;
}

export function resizeToolbar() {
  resizeToolbarInternal();
}

function resizeToolbarInternal() {
  if (toolbarView === null || toolbarBaseWindow === null) {
    return;
  }
  // Using getContentBounds due to this being a frameless window. getBounds()
  // returns the incorrect bounds on Windows when in maximized state.
  const newBounds = toolbarBaseWindow.getContentBounds();
  toolbarView.setBounds({
    height: TOOLBAR_HEIGHT,
    width: newBounds.width - toolbarSidebarWidth,
    x: toolbarSidebarWidth,
    y: 0,
  });
}
