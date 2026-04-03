import {
  type BrowserConfig,
  type BrowserTarget,
  type ProjectSubdomain,
} from "@quests/workspace/electron";
import { BrowserWindow, session, WebContentsView } from "electron";

interface BrowserEntry {
  detachListeners: Set<() => void>;
  devWindow: BrowserWindow | null;
  eventListeners: Set<(method: string, params: unknown) => void>;
  subdomain: ProjectSubdomain;
  view: WebContentsView;
}

export class BrowserViewManager {
  public get browser(): BrowserConfig {
    return {
      closeTarget: (targetId) => this.closeTarget(targetId),
      createTarget: (subdomain) => this.createTarget(subdomain),
      listTargets: (subdomain) => this.listTargets(subdomain),
      sendCommand: (targetId, method, params) =>
        this.sendCommand(targetId, method, params),
      subscribeEvents: (targetId, onDetach, onEvent) =>
        this.subscribeEvents(targetId, onDetach, onEvent),
    };
  }

  private developerMode: boolean;
  private entries = new Map<string, BrowserEntry>();

  constructor({ developerMode = false }: { developerMode?: boolean } = {}) {
    this.developerMode = developerMode;
  }

  public teardown() {
    for (const targetId of this.entries.keys()) {
      this.destroyEntry(targetId);
    }
  }

  private closeTarget(targetId: string): Promise<void> {
    this.destroyEntry(targetId);
    return Promise.resolve();
  }

  private createTarget(
    subdomain: ProjectSubdomain,
  ): Promise<{ targetId: string }> {
    const partition = `persist:browser-${subdomain}`;
    const ses = session.fromPartition(partition);

    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        session: ses,
      },
    });

    const targetId = String(view.webContents.id);

    console.log(
      `[BrowserViewManager] createTarget subdomain=${subdomain} targetId=${targetId}`,
    );

    let devWindow: BrowserWindow | null = null;
    if (this.developerMode) {
      devWindow = new BrowserWindow({
        height: 800,
        title: `Agent Browser [${subdomain}]`,
        width: 1280,
      });
      devWindow.contentView.addChildView(view);
      const fitViewToWindow = () => {
        if (!devWindow || devWindow.isDestroyed()) {
          return;
        }
        const size = devWindow.getContentSize();
        const width = size[0] ?? 0;
        const height = size[1] ?? 0;
        view.setBounds({ height, width, x: 0, y: 0 });
      };
      fitViewToWindow();
      devWindow.on("resize", fitViewToWindow);
    }

    view.webContents.on("did-navigate", (_event, url) => {
      console.log(
        `[BrowserViewManager] did-navigate targetId=${targetId} url=${url}`,
      );
    });

    view.webContents.on("did-navigate-in-page", (_event, url) => {
      console.log(
        `[BrowserViewManager] did-navigate-in-page targetId=${targetId} url=${url}`,
      );
    });

    view.webContents.on(
      "did-fail-load",
      (_event, errorCode, errorDescription, validatedURL) => {
        console.error(
          `[BrowserViewManager] did-fail-load targetId=${targetId} url=${validatedURL} errorCode=${errorCode} errorDescription=${errorDescription}`,
        );
      },
    );

    const entry: BrowserEntry = {
      detachListeners: new Set(),
      devWindow,
      eventListeners: new Set(),
      subdomain,
      view,
    };

    this.entries.set(targetId, entry);

    view.webContents.on("destroyed", () => {
      this.handleDetach(targetId);
    });

    // Load about:blank to properly initialize the renderer frame. Without this
    // the WebContents is in an uninitialized state and Page.enable hangs when
    // the CDP debugger tries to enable page events.
    return new Promise((resolve) => {
      view.webContents.once("did-finish-load", () => {
        resolve({ targetId });
      });
      void view.webContents.loadURL("about:blank");
    });
  }

  private destroyEntry(targetId: string) {
    const entry = this.entries.get(targetId);
    if (!entry) {
      return;
    }

    const { devWindow, view } = entry;

    if (view.webContents.debugger.isAttached()) {
      try {
        view.webContents.debugger.detach();
      } catch {
        // Already detached
      }
    }

    if (!view.webContents.isDestroyed()) {
      view.webContents.close();
    }

    if (devWindow && !devWindow.isDestroyed()) {
      devWindow.close();
    }

    this.entries.delete(targetId);
  }

  private ensureDebuggerAttached(entry: BrowserEntry) {
    if (!entry.view.webContents.debugger.isAttached()) {
      entry.view.webContents.debugger.attach("1.3");

      entry.view.webContents.debugger.on(
        "message",
        (_event, method, params) => {
          const targetId = String(entry.view.webContents.id);
          const current = this.entries.get(targetId);
          if (!current) {
            return;
          }
          for (const listener of current.eventListeners) {
            listener(method, params as unknown);
          }
        },
      );

      entry.view.webContents.debugger.on("detach", () => {
        const targetId = String(entry.view.webContents.id);
        this.handleDetach(targetId);
      });
    }
  }

  private handleDetach(targetId: string) {
    const entry = this.entries.get(targetId);
    if (!entry) {
      return;
    }

    for (const listener of entry.detachListeners) {
      listener();
    }

    entry.detachListeners.clear();
    entry.eventListeners.clear();
    this.entries.delete(targetId);
  }

  private listTargets(subdomain: ProjectSubdomain): Promise<BrowserTarget[]> {
    const targets: BrowserTarget[] = [];

    for (const [targetId, entry] of this.entries) {
      if (entry.subdomain !== subdomain) {
        continue;
      }

      const wc = entry.view.webContents;
      if (wc.isDestroyed()) {
        continue;
      }

      targets.push({
        id: targetId,
        title: wc.getTitle() || "about:blank",
        type: "page",
        url: wc.getURL() || "about:blank",
      });
    }

    // FIXME remove need for promise
    return Promise.resolve(targets);
  }

  private async sendCommand(
    targetId: string,
    method: string,
    params: unknown,
  ): Promise<unknown> {
    const entry = this.entries.get(targetId);
    if (!entry) {
      console.error(
        `[BrowserViewManager] sendCommand: target not found targetId=${targetId} method=${method}`,
      );
      throw new Error(`Browser target not found: ${targetId}`);
    }

    this.ensureDebuggerAttached(entry);

    console.log(
      `[BrowserViewManager] sendCommand targetId=${targetId} method=${method} params=${JSON.stringify(params)}`,
    );

    // Electron's debugger protocol does not expose Page.printToPDF. Use the
    // native webContents.printToPDF() API and return a CDP-compatible response.
    if (method === "Page.printToPDF") {
      const p = (params ?? {}) as Record<string, unknown>;
      try {
        const data = await entry.view.webContents.printToPDF({
          landscape: p.landscape === true,
          preferCSSPageSize: p.preferCSSPageSize === true,
          printBackground: p.printBackground !== false,
        });
        const result = { data: data.toString("base64") };
        console.log(
          `[BrowserViewManager] sendCommand result targetId=${targetId} method=${method} result=(pdf ${data.byteLength} bytes)`,
        );
        return result;
      } catch (error) {
        console.error(
          `[BrowserViewManager] sendCommand error targetId=${targetId} method=${method} error=${String(error)}`,
        );
        throw error;
      }
    }

    try {
      const result = await entry.view.webContents.debugger.sendCommand(
        method,
        params as Record<string, unknown>,
      );
      console.log(
        `[BrowserViewManager] sendCommand result targetId=${targetId} method=${method} result=${JSON.stringify(result)}`,
      );
      return result;
    } catch (error) {
      console.error(
        `[BrowserViewManager] sendCommand error targetId=${targetId} method=${method} error=${String(error)}`,
      );
      throw error;
    }
  }

  private subscribeEvents(
    targetId: string,
    onDetach: () => void,
    onEvent: (method: string, params: unknown) => void,
  ): () => void {
    const entry = this.entries.get(targetId);
    if (!entry) {
      onDetach();
      return () => {
        /* No-op */
      };
    }

    this.ensureDebuggerAttached(entry);

    entry.eventListeners.add(onEvent);
    entry.detachListeners.add(onDetach);

    return () => {
      entry.eventListeners.delete(onEvent);
      entry.detachListeners.delete(onDetach);
      // Keep the debugger attached so subsequent connections (e.g. a second
      // agent-browser invocation in the same session) can reuse the target
      // without the entry being destroyed by the detach event.
    };
  }
}
