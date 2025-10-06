import { electronAPI } from "@electron-toolkit/preload";
import { contextBridge, ipcRenderer } from "electron";

const api: Window["api"] = {
  onNavigate: (callback: (url: string) => void) =>
    ipcRenderer.on("navigate", (_event, value: string) => {
      callback(value);
    }),
};

const tabId = process.argv
  .find((arg) => arg.startsWith("--tabId="))
  ?.split("=")[1];

if (tabId) {
  api.tabId = tabId;
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to expose Electron APIs to renderer", error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
}

window.addEventListener("message", (event) => {
  if (event.data === "start-orpc-client") {
    const [serverPort] = event.ports;

    if (!serverPort) {
      // eslint-disable-next-line no-console
      console.error("No server port found for ORPC client");
      return;
    }

    ipcRenderer.postMessage("start-orpc-server", null, [serverPort]);
  }
});
