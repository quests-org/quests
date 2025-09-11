/// <reference types="electron-vite/node" />

import "dotenv/config";
import { startAuthCallbackServer } from "@/electron-main/auth/server";
import { type RendererHandlers } from "@/electron-main/handlers/renderer-handlers";
import {
  initializeElectronLogging,
  logger,
} from "@/electron-main/lib/electron-logger";
import { getMainWindow, setMainWindow } from "@/electron-main/lib/main-window";
import { createToolbar } from "@/electron-main/lib/toolbar";
import { StudioAppUpdater } from "@/electron-main/lib/update";
import { mainAppUrl } from "@/electron-main/lib/urls";
import { createTabsManager, getTabsManager } from "@/electron-main/tabs";
import { isFeatureEnabled } from "@/shared/features";
import {
  getRendererHandlers,
  type RendererHandlersCaller,
} from "@egoist/tipc/main";
import { is, optimizer } from "@electron-toolkit/utils";
import { APP_PROTOCOL } from "@quests/shared";
import {
  app,
  type BaseWindow,
  BrowserWindow,
  Menu,
  type MenuItemConstructorOptions,
  nativeTheme,
  protocol,
  shell,
} from "electron";
import Store from "electron-store";
import path from "node:path";

import icon from "../../resources/icon.png?asset";
import { createWorkspaceActor } from "./lib/create-workspace-actor";
import { registerTelemetry } from "./lib/register-telemetry";
import {
  shouldUseDarkMode,
  watchThemePreferenceAndApply,
} from "./lib/theme-utils";
import { initializeRPC } from "./rpc/initialize";
import { openSettingsWindow } from "./windows/settings";

if (is.dev) {
  let suffix = "";
  if (process.env.ELECTRON_USE_NEW_USER_FOLDER === "true") {
    suffix = ` (${Date.now().toString()})`;
  }
  const DEV_APP_NAME = `Quests (Dev${suffix})`;
  if (suffix) {
    logger.info(`Using user folder ${DEV_APP_NAME}`);
  }

  // Sandbox userData during development to Quests/Quests (Dev)/*
  // Must be done as soon as possible because it's stateful
  app.setPath(
    "userData",
    path.join(app.getPath("userData"), "..", DEV_APP_NAME),
  );
  app.setName(DEV_APP_NAME);
}

let toolbar: Electron.CrossProcessExports.WebContentsView | null = null;
let toolbarRenderHandlers: RendererHandlersCaller<RendererHandlers> | undefined;
let appUpdater: StudioAppUpdater | undefined;

const renderHandlersProxy = new Proxy<RendererHandlersCaller<RendererHandlers>>(
  Object.create(null) as RendererHandlersCaller<RendererHandlers>,
  {
    get: <K extends keyof RendererHandlers>(_target: unknown, prop: K) => {
      const tabsManager = getTabsManager();
      return {
        send: (...args: Parameters<RendererHandlers[K]>) => {
          const handlers = [
            ...(tabsManager?.getTabRenderHandlers() ?? []),
            toolbarRenderHandlers,
          ].filter((h) => h !== undefined);
          for (const handler of handlers) {
            const method = handler[prop];
            if (typeof method === "object" && "send" in method) {
              (
                method.send as (
                  ...args: Parameters<RendererHandlers[K]>
                ) => void
              )(...args);
            }
          }
        },
      };
    },
  },
);

const toolbarRenderHandlersProxy = new Proxy<
  RendererHandlersCaller<RendererHandlers>
>(Object.create(null) as RendererHandlersCaller<RendererHandlers>, {
  get: (_target, prop) => {
    if (!toolbarRenderHandlers) {
      return;
    }
    return toolbarRenderHandlers[prop as keyof typeof toolbarRenderHandlers];
  },
});

initializeElectronLogging();

interface WindowState {
  bounds: {
    height: number;
    width: number;
    x?: number;
    y?: number;
  };
  isMaximized: boolean;
}

const windowStateStore = new Store<WindowState>({
  defaults: {
    bounds: {
      height: 900,
      width: 1400,
    },
    isMaximized: false,
  },
  name: "window-state",
});

function createApplicationMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: app.getName(),
      role: "appMenu",
      submenu: [
        { role: "about" },
        {
          click: () => {
            void appUpdater?.checkForUpdates({ notify: true });
          },
          label: "Check for Updates...",
        },
        { type: "separator" },
        {
          accelerator: "CmdOrCtrl+,",
          click: () => {
            openSettingsWindow();
          },
          label: "Settings...",
        },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "File",
      submenu: [
        {
          accelerator: "CmdOrCtrl+T",
          click: () => {
            const tabsManager = getTabsManager();
            void tabsManager?.addTab({
              urlPath: "/new-tab",
            });
          },
          label: "New Tab",
        },
        {
          accelerator: "CmdOrCtrl+W",
          click: () => {
            const tabsManager = getTabsManager();
            const selectedTabId = tabsManager?.getState().selectedTabId;
            if (selectedTabId) {
              void tabsManager.closeTab({ id: selectedTabId });
            }
          },
          label: "Close Tab",
        },
        { type: "separator" },
        {
          accelerator: "CmdOrCtrl+1",
          click: () => {
            const tabsManager = getTabsManager();
            tabsManager?.selectTabByIndex({ index: 0 });
          },
          label: "Switch to Tab 1",
        },
        {
          accelerator: "CmdOrCtrl+2",
          click: () => {
            const tabsManager = getTabsManager();
            tabsManager?.selectTabByIndex({ index: 1 });
          },
          label: "Switch to Tab 2",
        },
        {
          accelerator: "CmdOrCtrl+3",
          click: () => {
            const tabsManager = getTabsManager();
            tabsManager?.selectTabByIndex({ index: 2 });
          },
          label: "Switch to Tab 3",
        },
        {
          accelerator: "CmdOrCtrl+4",
          click: () => {
            const tabsManager = getTabsManager();
            tabsManager?.selectTabByIndex({ index: 3 });
          },
          label: "Switch to Tab 4",
        },
        {
          accelerator: "CmdOrCtrl+5",
          click: () => {
            const tabsManager = getTabsManager();
            tabsManager?.selectTabByIndex({ index: 4 });
          },
          label: "Switch to Tab 5",
        },
        {
          accelerator: "CmdOrCtrl+6",
          click: () => {
            const tabsManager = getTabsManager();
            tabsManager?.selectTabByIndex({ index: 5 });
          },
          label: "Switch to Tab 6",
        },
        {
          accelerator: "CmdOrCtrl+7",
          click: () => {
            const tabsManager = getTabsManager();
            tabsManager?.selectTabByIndex({ index: 6 });
          },
          label: "Switch to Tab 7",
        },
        {
          accelerator: "CmdOrCtrl+8",
          click: () => {
            const tabsManager = getTabsManager();
            tabsManager?.selectTabByIndex({ index: 7 });
          },
          label: "Switch to Tab 8",
        },
        {
          accelerator: "CmdOrCtrl+9",
          click: () => {
            const tabsManager = getTabsManager();
            // Command+9 typically goes to the last tab
            const state = tabsManager?.getState();
            if (state?.tabs.length) {
              tabsManager?.selectTabByIndex({ index: state.tabs.length - 1 });
            }
          },
          label: "Switch to Last Tab",
        },
      ],
    },
    {
      label: "Edit",
      role: "editMenu",
    },
    {
      label: "View",
      role: "viewMenu",
      submenu: [
        {
          accelerator: "CmdOrCtrl+[",
          click: () => {
            const tabsManager = getTabsManager();
            tabsManager?.goBack();
          },
          label: "Back",
        },
        {
          accelerator: "CmdOrCtrl+]",
          click: () => {
            const tabsManager = getTabsManager();
            tabsManager?.goForward();
          },
          label: "Forward",
        },
        { type: "separator" },
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      role: "windowMenu",
    },
    {
      label: "Help",
      role: "help",
      submenu: [
        {
          click: () => {
            void shell.openExternal("https://quests.dev");
          },
          label: "Learn More",
        },
      ],
    },
    ...(is.dev
      ? [
          {
            label: "Dev Tools",
            submenu: [
              {
                click: () => {
                  renderHandlersProxy.testNotification.send();
                },
                label: "Send test notification",
              },
              {
                click: () => {
                  const tabsManager = getTabsManager();
                  void tabsManager?.addTab({ urlPath: "/setup" });
                },
                label: "Open Setup Tab",
              },
            ],
          },
        ]
      : []),
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function createWindow() {
  const boundsState = windowStateStore.get("bounds");

  const mainWindow = new BrowserWindow({
    ...boundsState,
    show: false,
    titleBarStyle: process.platform === "win32" ? "hidden" : "hiddenInset",
    trafficLightPosition: { x: 12, y: 12 },
    ...(process.platform === "linux" ? { icon } : {}),
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
  mainWindow.on("ready-to-show", () => {
    showWindow(mainWindow);
  });

  toolbar = await createToolbar({ baseWindow: mainWindow });

  if (toolbar) {
    toolbarRenderHandlers = getRendererHandlers<RendererHandlers>(
      toolbar.webContents,
    );
  }

  const tabsManager = createTabsManager({
    baseWindow: mainWindow,
    toolbarRenderHandlers: toolbarRenderHandlersProxy,
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

  if (is.dev) {
    mainWindow.webContents.on("context-menu", (_, props) => {
      const menu = Menu.buildFromTemplate([
        {
          click: () => {
            mainWindow.webContents.openDevTools({
              mode: "detach",
              title: "DevTools - Sidebar",
            });
          },
          label: "Open DevTools in New Window",
        },
        {
          click: () => {
            mainWindow.webContents.inspectElement(props.x, props.y);
          },
          label: "Inspect Element",
        },
      ]);
      menu.popup({ window: mainWindow });
    });
  }

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: "deny" };
  });

  return mainWindow;
}

function getTitleBarOverlay() {
  const isDark = shouldUseDarkMode();
  return {
    color: isDark ? "#272a2d" : "#e7e8ec",
    height: 40,
    symbolColor: isDark ? "#ffffff" : "#3f3f3f",
  };
}

protocol.registerSchemesAsPrivileged([
  {
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
    },
    scheme: APP_PROTOCOL,
  },
]);

app.setAsDefaultProtocolClient(APP_PROTOCOL);

registerTelemetry(app);

function updateTitleBarOverlay() {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setTitleBarOverlay(getTitleBarOverlay());
  }
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void app.whenReady().then(async () => {
  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createApplicationMenu();
  watchThemePreferenceAndApply(updateTitleBarOverlay);

  nativeTheme.on("updated", () => {
    updateTitleBarOverlay();
  });

  appUpdater = new StudioAppUpdater({
    renderHandlers: renderHandlersProxy,
  });
  appUpdater.pollForUpdates();
  const { actor: workspaceRef, workspaceConfig } = createWorkspaceActor();

  initializeRPC({ appUpdater, workspaceConfig, workspaceRef });

  await createWindow();

  if (isFeatureEnabled("questsAccounts")) {
    void startAuthCallbackServer();
  }

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

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
