import { app } from "electron";
import log from "electron-log";
import path from "node:path";

// Configure electron-log
// In development: ~/Library/Logs/Quests/main.log
// In production: ~/Library/Application Support/Quests/logs/main.log
log.transports.file.resolvePathFn = () => {
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    return path.join(
      app.getPath("home"),
      "Library",
      "Logs",
      "Quests",
      "main.log",
    );
  }
  return path.join(app.getPath("userData"), "logs", "main.log");
};

// Configure log level based on environment
log.transports.file.level =
  process.env.NODE_ENV === "development" ? "debug" : "info";

// Also log to console in development
log.transports.console.level =
  process.env.NODE_ENV === "development" ? "debug" : false;

export { default as logger } from "electron-log";

export function initializeElectronLogging() {
  /* eslint-disable @typescript-eslint/unbound-method */
  /* eslint-disable no-console */
  console.log = log.log;
  console.error = log.error;
  console.warn = log.warn;
  console.info = log.info;
  console.debug = log.debug;
  /* eslint-enable @typescript-eslint/unbound-method */
  /* eslint-enable no-console */
}
