import { getMainWindow } from "@/electron-main/windows/main/instance";
import { type BaseWindow, Menu, shell, WebContentsView } from "electron";
import path from "node:path";

import { getSidebarWidth } from "../lib/sidebar";
import { getBackgroundColor } from "../lib/theme-utils";
import { mainAppUrl } from "../lib/urls";

const toolbarHeight = 40;
let toolbarView: null | WebContentsView = null;

export function createToolbar({
  baseWindow,
}: {
  baseWindow: BaseWindow;
}): Promise<null | WebContentsView> {
  return new Promise((resolve) => {
    if (toolbarView !== null) {
      resolve(toolbarView);
      return;
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

    toolbarView.webContents.on("context-menu", (_, props) => {
      const menu = Menu.buildFromTemplate([
        {
          click: () => {
            toolbarView?.webContents.openDevTools({
              mode: "detach",
              title: "DevTools - Toolbar",
            });
          },
          label: "Open DevTools in New Window",
        },
        {
          click: () => {
            toolbarView?.webContents.inspectElement(props.x, props.y);
          },
          label: "Inspect Element",
        },
      ]);
      menu.popup({ window: baseWindow, x: props.x, y: props.y });
    });

    const bounds = baseWindow.getContentBounds();
    const sidebarWidth = getSidebarWidth();
    toolbarView.setBounds({
      height: toolbarHeight,
      width: bounds.width - sidebarWidth,
      x: sidebarWidth,
      y: 0,
    });

    void toolbarView.webContents.loadURL(mainAppUrl("/toolbar"));
    toolbarView.webContents.on("did-finish-load", () => {
      resolve(toolbarView);
    });

    toolbarView.webContents.on("did-fail-load", () => {
      resolve(null);
    });
  });
}

export function getToolbarHeight() {
  return toolbarHeight;
}

export function getToolbarView() {
  return toolbarView;
}

export function resizeToolbar({ baseWindow }: { baseWindow: BaseWindow }) {
  const newBounds = baseWindow.getContentBounds();
  if (toolbarView === null) {
    return;
  }
  const sidebarWidth = getSidebarWidth();
  toolbarView.setBounds({
    height: toolbarHeight,
    width: newBounds.width - sidebarWidth,
    x: sidebarWidth,
    y: 0,
  });
}

export function updateToolbarForSidebarChange() {
  if (toolbarView) {
    const baseWindow = getMainWindow();
    // Using getContentBounds due to this being a frameless window. getBounds()
    // returns the incorrect bounds on Windows when in maximized state.
    const bounds = baseWindow?.getContentBounds();

    if (!bounds) {
      return;
    }

    const sidebarWidth = getSidebarWidth();
    toolbarView.setBounds({
      height: toolbarHeight,
      width: bounds.width - sidebarWidth,
      x: sidebarWidth,
      y: 0,
    });
  }
}
