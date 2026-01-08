import { createContextMenu } from "@/electron-main/lib/context-menu";
import { logger } from "@/electron-main/lib/electron-logger";
import { getSidebarWidth } from "@/electron-main/lib/sidebar";
import { getBackgroundColor } from "@/electron-main/lib/theme-utils";
import { publisher } from "@/electron-main/rpc/publisher";
import {
  getToolbarHeight,
  resizeToolbar,
} from "@/electron-main/windows/toolbar";
import { type StudioPath } from "@/shared/studio-path";
import {
  META_TAGS,
  SingleTabOnlyRoutes,
  type Tab,
  type TabState,
} from "@/shared/tabs";
import { TabIconsSchema } from "@quests/shared/icons";
import { ProjectSubdomainSchema } from "@quests/workspace/client";
import { type BaseWindow, shell, WebContentsView } from "electron";
import { type LogFunctions } from "electron-log";
import Store from "electron-store";
import path from "node:path";

import { captureServerException } from "../lib/capture-server-exception";
import { unsafe_studioURL } from "../lib/urls";

interface TabStore {
  root?: TabState;
}

interface TabWithView extends Tab {
  webView: WebContentsView;
}

export class TabsManager {
  private baseWindow: BaseWindow;
  private logger: LogFunctions;
  private selectedTabId: null | string = null;
  private store: Store<TabStore>;
  private tabs: TabWithView[];

  public constructor({ baseWindow }: { baseWindow: BaseWindow }) {
    this.tabs = [];
    this.logger = logger.scope("tabs");
    this.baseWindow = baseWindow;
    this.store = new Store<TabStore>({ name: "tabs" });
    this.store.onDidAnyChange((value) => {
      if (value?.root) {
        this.emitStateChange(value.root);
      }
    });
  }

  public async addTab({
    params = {},
    select = true,
    urlPath = "/",
  }: {
    params?: Record<string, string>;
    select?: boolean;
    urlPath?: StudioPath;
  }) {
    const searchParams = new URLSearchParams(params);
    const queryString = searchParams.toString();
    const pathWithParams = urlPath + (queryString ? `?${queryString}` : "");

    if (this.selectOnAddNewTab({ urlPath: pathWithParams })) {
      return;
    }

    const id = crypto.randomUUID();
    const view = await this.createTabView({ id, urlPath: pathWithParams });
    if (view === null) {
      this.logger.error("Failed to create new tab");
      return;
    }

    const newTab = {
      icon: undefined,
      id,
      pathname: pathWithParams,
      pinned: false,
      webView: view,
    };

    this.tabs.push(newTab);
    if (select) {
      this.showTabView(newTab);
    }
    this.afterUpdate();
  }

  public closeAllTabs() {
    for (const tab of this.tabs) {
      this.closeTabView(tab);
    }

    this.tabs = [];
    this.selectedTabId = null;
    this.afterUpdate();
  }

  public async closeTab({ id }: { id: string }) {
    const tabIndex = this.tabs.findIndex((tab) => tab.id === id);
    const tab = this.tabs[tabIndex];

    if (tab === undefined) {
      this.logger.error(`Closing tab: Tab ${id} not found`);
      return;
    }

    // Prevent closing pinned tabs
    if (tab.pinned) {
      this.logger.warn(`Cannot close pinned tab: ${id}`);
      return;
    }

    this.closeTabView(tab);
    this.selectNextTab(tab, tabIndex);
    this.tabs = this.tabs.filter((t) => t.id !== id);

    if (this.tabs.length === 0) {
      await this.addTab({});
    } else {
      this.afterUpdate();
    }
  }

  public focusCurrentTab() {
    const tab = this.getCurrentTab();
    if (tab) {
      tab.webView.webContents.focus();
    }
  }

  public getCurrentTab(): null | TabWithView {
    return this.tabs.find((tab) => tab.id === this.selectedTabId) ?? null;
  }

  public getState(): TabState {
    return {
      selectedTabId: this.selectedTabId,
      tabs: this.tabs.map(({ webView: _webView, ...tab }) => tab),
    };
  }

  public getTabs() {
    return this.tabs;
  }

  public goBack() {
    const tab = this.getCurrentTab();
    if (tab) {
      tab.webView.webContents.navigationHistory.goBack();
      tab.webView.webContents.focus();
    }
  }

  public goForward() {
    const tab = this.getCurrentTab();
    if (tab) {
      tab.webView.webContents.navigationHistory.goForward();
      tab.webView.webContents.focus();
    }
  }

  public async initialize() {
    const data = this.store.get("root") ?? {
      selectedTabId: null,
      tabs: [],
    };

    this.selectedTabId = data.selectedTabId;

    const tabs = await Promise.all(
      data.tabs
        .filter((tab) => !tab.pinned)
        .map(async (tab) => {
          const view = await this.createTabView({
            id: tab.id,
            // Unsafe, but cannot be verified. Client will handle possible 404s
            urlPath: tab.pathname as StudioPath,
          });
          if (view) {
            return {
              ...tab,
              iconName: tab.iconName || undefined,
              pinned: tab.pinned || false,
              webView: view,
            };
          }
          return null;
        }),
    );

    this.tabs = tabs.filter((tab) => tab !== null);
    const selectedTab = this.tabs.find((tab) => tab.id === this.selectedTabId);

    if (selectedTab) {
      this.showTabView(selectedTab);
    } else if (this.tabs[0]) {
      this.showTabView(this.tabs[0]);
    } else {
      await this.addTab({});
    }

    this.afterUpdate();
    this.emitStateChange(this.getState());
  }

  public reorderTabs(ids: string[]) {
    // Separate pinned and non-pinned tabs
    const pinnedTabs = this.tabs.filter((tab) => tab.pinned);
    const nonPinnedTabs = this.tabs.filter((tab) => !tab.pinned);

    // Only reorder non-pinned tabs
    const reorderedNonPinned = ids
      .filter((id) => !this.tabs.find((tab) => tab.id === id)?.pinned)
      .map((id) => nonPinnedTabs.find((tab) => tab.id === id))
      .filter((tab) => tab !== undefined);

    // Keep pinned tabs first, then reordered non-pinned tabs
    this.tabs = [...pinnedTabs, ...reorderedNonPinned];
    this.afterUpdate();
  }

  public resetZoom() {
    const tab = this.getCurrentTab();
    tab?.webView.webContents.setZoomLevel(0);
  }

  public selectTab({ id }: { id: string }) {
    const tab = this.tabs.find((t) => t.id === id);
    if (tab) {
      this.showTabView(tab);
      this.selectedTabId = tab.id;
      this.afterUpdate();
    }
  }

  public selectTabByIndex({ index }: { index: number }) {
    // Ensure index is within bounds
    if (index >= 0 && index < this.tabs.length) {
      const tab = this.tabs[index];
      if (tab) {
        this.showTabView(tab);
        this.selectedTabId = tab.id;
        this.afterUpdate();
      }
    }
  }

  public teardown() {
    for (const tab of this.tabs) {
      this.closeTabView(tab);
    }

    this.baseWindow.removeAllListeners("resize");
  }

  public updateTabsForSidebarChange() {
    for (const tab of this.tabs) {
      this.updateTabBounds(tab);
    }
  }

  public zoomIn() {
    const tab = this.getCurrentTab();
    if (tab) {
      const zoomLevel = tab.webView.webContents.getZoomLevel();
      tab.webView.webContents.setZoomLevel(zoomLevel + 0.5);
    }
  }

  public zoomOut() {
    const tab = this.getCurrentTab();
    if (tab) {
      const zoomLevel = tab.webView.webContents.getZoomLevel();
      tab.webView.webContents.setZoomLevel(zoomLevel - 0.5);
    }
  }

  private afterUpdate() {
    this.store.set("root", this.getState());
  }

  private closeTabView(tab: TabWithView) {
    this.baseWindow.contentView.removeChildView(tab.webView);
    tab.webView.webContents.close();
  }

  private async createTabView({
    id,
    urlPath,
  }: {
    id: string;
    urlPath: string;
  }) {
    return new Promise<null | WebContentsView>((resolve) => {
      const url = unsafe_studioURL(urlPath);
      const newContentView = new WebContentsView({
        webPreferences: {
          additionalArguments: [`--tabId=${id}`],
          preload: path.join(import.meta.dirname, "../preload/index.mjs"),
          sandbox: false,
        },
      });

      resolve(newContentView);

      createContextMenu({ windowOrWebContentsView: newContentView });

      newContentView.setBackgroundColor(getBackgroundColor());

      newContentView.webContents.setWindowOpenHandler((details) => {
        void shell.openExternal(details.url);
        return { action: "deny" };
      });

      newContentView.webContents.on("did-navigate-in-page", (_, newUrl) => {
        const tab = this.tabs.find((t) => t.id === id);
        const pathname = newUrl.split("#")[1];
        if (tab && pathname) {
          tab.pathname = pathname;
          this.afterUpdate();
        }
      });

      newContentView.webContents.on("page-title-updated", (_event, title) => {
        void (async () => {
          const tab = this.tabs.find((t) => t.id === id);

          if (!tab) {
            return;
          }

          if (title.trim()) {
            tab.title = title.trim();
          }

          await this.updateMetaTags(tab);
          this.afterUpdate();
        })();
      });

      void newContentView.webContents.loadURL(url);
    });
  }

  private emitStateChange(value: TabState) {
    publisher.publish("tabs.updated", value);
  }

  private selectNextTab(tab: Tab, index: number) {
    const isSelected = this.selectedTabId === tab.id;

    if (isSelected) {
      const nextTab = this.tabs[index + 1];
      if (nextTab) {
        this.showTabView(nextTab);
        return;
      }

      const prevTab = this.tabs[index - 1];
      if (prevTab) {
        this.showTabView(prevTab);
        return;
      }
    }
  }

  private selectOnAddNewTab({ urlPath }: { urlPath: string }) {
    if (!SingleTabOnlyRoutes.test(urlPath)) {
      return false;
    }

    const existingTab = this.tabs.find((tab) => {
      const tabPathName = tab.pathname.split("?")[0];
      return urlPath === tabPathName;
    });

    if (existingTab) {
      this.showTabView(existingTab);
      this.afterUpdate();
      return true;
    }

    return false;
  }

  private showTabView(tab: TabWithView) {
    const setWebContentBounds = () => {
      this.updateTabBounds(tab);
    };

    setWebContentBounds();
    this.baseWindow.removeAllListeners("resize");

    this.baseWindow.on("resize", () => {
      setWebContentBounds();
      resizeToolbar({
        baseWindow: this.baseWindow,
        sidebarWidth: getSidebarWidth(),
      });
    });

    this.baseWindow.contentView.addChildView(tab.webView);
    tab.webView.webContents.focus();
    this.selectedTabId = tab.id;
  }

  private async updateMetaTags(tab: TabWithView) {
    const metaTagQueries = {
      iconName: META_TAGS.iconName,
      projectSubdomain: META_TAGS.projectSubdomain,
    } as const;

    type MetaTagsResult = {
      [K in keyof typeof metaTagQueries]: string | undefined;
    };

    const queries = Object.entries(metaTagQueries)
      .map(
        ([key, name]) => `${JSON.stringify(key)}: (() => {
        const el = document.querySelector('meta[name="${name}"]');
        return el ? el.getAttribute('content') : undefined;
      })()`,
      )
      .join(",\n        ");

    const script = `
      (() => {
        return {
          ${queries}
        };
      })()
    `;

    try {
      const metaTags = (await tab.webView.webContents.executeJavaScript(
        script,
      )) as MetaTagsResult;
      const iconNameResult = TabIconsSchema.safeParse(metaTags.iconName);
      tab.iconName = iconNameResult.success ? iconNameResult.data : undefined;
      const projectSubdomainResult = ProjectSubdomainSchema.safeParse(
        metaTags.projectSubdomain,
      );
      tab.projectSubdomain = projectSubdomainResult.success
        ? projectSubdomainResult.data
        : undefined;
    } catch (error) {
      captureServerException(
        new Error("Failed to update meta tags", { cause: error }),
        { scopes: ["studio"] },
      );
    }
  }

  private updateTabBounds(tab: TabWithView) {
    // Using getContentBounds due to this being a frameless window. getBounds()
    // returns the incorrect bounds on Windows when in maximized state.
    const newBounds = this.baseWindow.getContentBounds();
    const sidebarWidth = getSidebarWidth();
    tab.webView.setBounds({
      height: newBounds.height - getToolbarHeight(),
      width: newBounds.width - sidebarWidth,
      x: sidebarWidth,
      y: getToolbarHeight(),
    });
  }
}
