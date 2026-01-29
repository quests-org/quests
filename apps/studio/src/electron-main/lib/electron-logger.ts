import { app } from "electron";
import log from "electron-log";
import path from "node:path";

const ENABLE_CONSOLE_LOGGING =
  process.env.NODE_ENV === "development" ||
  process.env.ELECTRON_ENABLE_CONSOLE_LOGGING === "true";

log.transports.file.resolvePathFn = () => {
  return path.join(app.getPath("userData"), "logs", "main.log");
};

log.transports.file.level =
  process.env.NODE_ENV === "development" ? false : "info";

// Enable console logging in development or when explicitly requested
log.transports.console.level = ENABLE_CONSOLE_LOGGING ? "silly" : false;

export { default as logger } from "electron-log";

export function initializeElectronLogging() {
  Object.assign(console, log.functions);
}
