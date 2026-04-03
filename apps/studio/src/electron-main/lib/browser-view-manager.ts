import {
  type BrowserConfig,
  type BrowserTarget,
  type ProjectSubdomain,
} from "@quests/workspace/electron";
import { BrowserWindow, session, WebContentsView } from "electron";

const SCREENCAST_INTERVAL_MS = 100;

interface BrowserEntry {
  authorizedDownloadPath: null | string;
  detachListeners: Set<() => void>;
  devWindow: BrowserWindow | null;
  eventListeners: Set<(method: string, params: unknown) => void>;
  // Maps download URL -> GUID from Page.downloadWillBegin, consumed by will-download.
  pendingDownloadGuids: Map<string, string>;
  screencastInterval: null | ReturnType<typeof setInterval>;
  screencastSessionId: number;
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
        session: ses,
      },
    });

    const targetId = String(view.webContents.id);

    // Register a single will-download handler for this session. If the agent
    // has authorized a download path via setDownloadBehavior, route the file
    // there using the GUID as filename (matching agent-browser's "allowAndName"
    // expectation), falling back to the original filename if no GUID was captured.
    ses.on("will-download", (_event, item) => {
      const entry = this.entries.get(targetId);
      if (entry?.authorizedDownloadPath) {
        const guid =
          entry.pendingDownloadGuids.get(item.getURL()) ?? crypto.randomUUID();
        entry.pendingDownloadGuids.delete(item.getURL());
        const filename = guid;
        item.setSavePath(`${entry.authorizedDownloadPath}/${filename}`);

        // Synthesize Page.downloadWillBegin so agent-browser's download command
        // can capture the GUID and start waiting for completion.
        for (const listener of entry.eventListeners) {
          listener("Page.downloadWillBegin", {
            frameId: targetId,
            guid,
            url: item.getURL(),
          });
        }

        item.once("done", (_doneEvent, state) => {
          const currentEntry = this.entries.get(targetId);
          if (!currentEntry) {
            return;
          }
          // Synthesize Page.downloadProgress so agent-browser resolves or errors.
          for (const listener of currentEntry.eventListeners) {
            listener("Page.downloadProgress", {
              guid,
              receivedBytes: item.getReceivedBytes(),
              state: state === "completed" ? "completed" : "canceled",
              totalBytes: item.getTotalBytes(),
            });
          }
        });
      } else {
        item.cancel();
      }
    });

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
      authorizedDownloadPath: null,
      detachListeners: new Set(),
      devWindow,
      eventListeners: new Set(),
      pendingDownloadGuids: new Map(),
      screencastInterval: null,
      screencastSessionId: 0,
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
        // Set a default 1280x720 layout viewport so DOM.getBoxModel coordinates
        // and Input.dispatchMouseEvent coordinates are consistent when the view
        // has no physical bounds (i.e. outside of developer mode).
        this.ensureDebuggerAttached(entry);
        void view.webContents.debugger
          .sendCommand("Emulation.setDeviceMetricsOverride", {
            deviceScaleFactor: 1,
            // 1280x800: matches a 13" MacBook viewport in Chrome (1280 CSS px wide,
            // ~90px consumed by browser chrome on a 900px-tall screen).
            height: 800,
            mobile: false,
            width: 1280,
          })
          .catch(() => {
            // Non-fatal; the view will fall back to its physical bounds.
          })
          .finally(() => {
            resolve({ targetId });
          });
      });
      void view.webContents.loadURL("about:blank");
    });
  }

  private destroyEntry(targetId: string) {
    const entry = this.entries.get(targetId);
    if (!entry) {
      return;
    }

    this.stopScreencast(entry);

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
          // Capture the GUID from Page.downloadWillBegin so will-download can
          // save with the GUID filename that agent-browser expects to find.
          if (method === "Page.downloadWillBegin") {
            const p = params as { guid?: string; url?: string };
            if (p.guid && p.url) {
              current.pendingDownloadGuids.set(p.url, p.guid);
            }
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

    // Electron's debugger does not expose Page.startScreencast / stopScreencast.
    // Emulate them by polling webContents.capturePage() and emitting synthetic
    // Page.screencastFrame events into the event listener set.
    if (method === "Page.startScreencast") {
      const p = (params ?? {}) as Record<string, unknown>;
      const format = typeof p.format === "string" ? p.format : "jpeg";
      const quality = typeof p.quality === "number" ? p.quality : 80;
      const maxWidth = typeof p.maxWidth === "number" ? p.maxWidth : 1280;
      const maxHeight = typeof p.maxHeight === "number" ? p.maxHeight : 720;
      this.startScreencast(entry, format, quality, maxWidth, maxHeight);
      return {};
    }

    if (method === "Page.stopScreencast") {
      this.stopScreencast(entry);
      return {};
    }

    // screencastFrameAck is a flow-control signal back to the browser; since
    // we drive the capture loop ourselves we can silently acknowledge it.
    if (method === "Page.screencastFrameAck") {
      return {};
    }

    // Electron does not support CDP browser context management. Map
    // Browser.setDownloadBehavior to the native Electron session API instead.
    if (method === "Browser.setDownloadBehavior") {
      const p = (params ?? {}) as Record<string, unknown>;
      const downloadPath =
        typeof p.downloadPath === "string" ? p.downloadPath : null;
      const behavior = typeof p.behavior === "string" ? p.behavior : "default";
      if (
        (behavior === "allow" || behavior === "allowAndName") &&
        downloadPath
      ) {
        entry.authorizedDownloadPath = downloadPath;
        entry.view.webContents.session.setDownloadPath(downloadPath);
      } else {
        entry.authorizedDownloadPath = null;
      }
      return {};
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

  private startScreencast(
    entry: BrowserEntry,
    format: string,
    quality: number,
    maxWidth: number,
    maxHeight: number,
  ) {
    this.stopScreencast(entry);
    entry.screencastSessionId += 1;
    const screencastSessionId = entry.screencastSessionId;

    const captureAndEmit = () => {
      if (entry.view.webContents.isDestroyed()) {
        this.stopScreencast(entry);
        return;
      }
      void entry.view.webContents
        .capturePage({ height: maxHeight, width: maxWidth, x: 0, y: 0 })
        .then((image) => {
          const data =
            format === "png"
              ? image.toPNG().toString("base64")
              : image.toJPEG(quality).toString("base64");
          const params = {
            data,
            metadata: {
              deviceHeight: maxHeight,
              deviceWidth: maxWidth,
              offsetTop: 0,
              pageScaleFactor: 1,
              scrollOffsetX: 0,
              scrollOffsetY: 0,
              timestamp: Date.now() / 1000,
            },
            sessionId: screencastSessionId,
          };
          for (const listener of entry.eventListeners) {
            listener("Page.screencastFrame", params);
          }
        });
    };

    entry.screencastInterval = setInterval(
      captureAndEmit,
      SCREENCAST_INTERVAL_MS,
    );
    captureAndEmit();
  }

  private stopScreencast(entry: BrowserEntry) {
    if (entry.screencastInterval !== null) {
      clearInterval(entry.screencastInterval);
      entry.screencastInterval = null;
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
