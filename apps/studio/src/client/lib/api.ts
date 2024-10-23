import { createEventHandlers } from "@egoist/tipc/renderer";

import type { RendererHandlers } from "../../electron-main/handlers/renderer-handlers";

export const handlers = createEventHandlers<RendererHandlers>({
  on: window.electron.ipcRenderer.on.bind(window.electron.ipcRenderer),
  send: window.electron.ipcRenderer.send.bind(window.electron.ipcRenderer),
});
