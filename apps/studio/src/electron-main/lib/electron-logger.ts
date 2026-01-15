import { app } from "electron";
import log from "electron-log";
import path from "node:path";

// Configure electron-log
log.transports.file.resolvePathFn = () => {
  return path.join(app.getPath("userData"), "logs", "main.log");
};

// Configure log level based on environment
log.transports.file.level =
  process.env.NODE_ENV === "development" ? false : "info";

// Also log to console in development
log.transports.console.level =
  process.env.NODE_ENV === "development" ? "silly" : false;

export { default as logger } from "electron-log";

export function initializeElectronLogging() {
  Object.assign(console, log.functions);
}
