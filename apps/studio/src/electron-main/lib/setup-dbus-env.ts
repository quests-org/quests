import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { platform } from "node:os";

import { logger } from "./electron-logger";

type Env = typeof process.env & {
  DBUS_SESSION_BUS_ADDRESS?: string;
  KDE_SESSION_VERSION?: string;
  XDG_RUNTIME_DIR?: string;
};

const env = process.env as Env;

const isLinux = (): boolean => platform() === "linux";

const hasValidDBusAddress = (): boolean => {
  return (
    !!env.DBUS_SESSION_BUS_ADDRESS &&
    env.DBUS_SESSION_BUS_ADDRESS !== "disabled:" &&
    !env.DBUS_SESSION_BUS_ADDRESS.startsWith("disabled")
  );
};

const listDBusServices = (): null | string => {
  try {
    return execSync(
      "dbus-send --session --print-reply --dest=org.freedesktop.DBus /org/freedesktop/DBus org.freedesktop.DBus.ListNames",
      { encoding: "utf8", timeout: 2000 },
    );
  } catch {
    logger.warn("Failed to query D-Bus services");
    return null;
  }
};

const detectKWalletVersion = (): string => {
  const kdeSession = env.KDE_SESSION_VERSION;
  if (kdeSession === "6") return "kwallet6";
  if (kdeSession === "5") return "kwallet5";
  return "kwallet";
};

const detectPasswordStore = (): null | string => {
  const dbusServices = listDBusServices();
  if (!dbusServices) {
    return null;
  }

  if (dbusServices.includes("org.freedesktop.secrets")) {
    return "gnome-libsecret";
  }

  if (
    dbusServices.includes("org.kde.kwalletd5") ||
    dbusServices.includes("org.kde.kwalletd")
  ) {
    return detectKWalletVersion();
  }

  return null;
};

// --- Environment Setup ---

const setupXDGRuntimeDir = (): void => {
  if (env.XDG_RUNTIME_DIR) {
    return;
  }

  const uid = process.getuid?.() ?? 1000;
  const runtimeDir = `/run/user/${uid}`;

  if (existsSync(runtimeDir)) {
    env.XDG_RUNTIME_DIR = runtimeDir;
    logger.info(`Set XDG_RUNTIME_DIR=${runtimeDir}`);
  } else {
    logger.warn(`Runtime directory ${runtimeDir} does not exist`);
  }
};

const readDBusAddressFromSessionFile = (): null | string => {
  if (!env.XDG_RUNTIME_DIR) {
    return null;
  }

  const dbusSessionFile = `${env.XDG_RUNTIME_DIR}/dbus-session`;
  if (!existsSync(dbusSessionFile)) {
    return null;
  }

  try {
    const content = readFileSync(dbusSessionFile, "utf8");
    const match = /DBUS_SESSION_BUS_ADDRESS=['"]?([^'"]+)['"]?/.exec(content);
    return match?.[1] ?? null;
  } catch (error) {
    logger.error("Failed to read dbus-session file", error);
    return null;
  }
};

const setupDBusAddress = (): void => {
  if (hasValidDBusAddress() || !env.XDG_RUNTIME_DIR) {
    return;
  }

  const dbusSocket = `${env.XDG_RUNTIME_DIR}/bus`;

  if (existsSync(dbusSocket)) {
    env.DBUS_SESSION_BUS_ADDRESS = `unix:path=${dbusSocket}`;
    logger.info(`Set DBUS_SESSION_BUS_ADDRESS=${env.DBUS_SESSION_BUS_ADDRESS}`);
    return;
  }

  logger.warn(`D-Bus socket ${dbusSocket} does not exist`);

  const addressFromFile = readDBusAddressFromSessionFile();
  if (addressFromFile) {
    env.DBUS_SESSION_BUS_ADDRESS = addressFromFile;
    logger.info(`Set DBUS_SESSION_BUS_ADDRESS from session file: ${addressFromFile}`);
  }
};

const logEnvironmentStatus = (): void => {
  logger.info(
    `D-Bus environment setup complete: XDG_RUNTIME_DIR=${env.XDG_RUNTIME_DIR ?? "undefined"}, DBUS_SESSION_BUS_ADDRESS=${env.DBUS_SESSION_BUS_ADDRESS ?? "undefined"}`,
  );
};

/**
 * Sets up the D-Bus environment variables if they are not already configured
 * and detects the available password store on Linux.
 * @returns The detected password store name or null if none is found or on non-Linux systems.
 */
export const setupDBusEnvironment = (): null | string => {
  if (!isLinux()) {
    return null;
  }

  if (env.XDG_RUNTIME_DIR && hasValidDBusAddress()) {
    logger.info("D-Bus environment already configured");
    return detectPasswordStore();
  }

  try {
    setupXDGRuntimeDir();
    setupDBusAddress();

    const passwordStore = detectPasswordStore();
    if (passwordStore) {
      logger.info(`Detected password store: ${passwordStore}`);
    }

    logEnvironmentStatus();

    return passwordStore;
  } catch (error) {
    logger.error("Failed to setup D-Bus environment", error);
    return null;
  }
};

/**
 * Detects the available password store on Linux without modifying the environment.
 * @returns The detected password store name or null.
 */
export const getPasswordStore = (): null | string => {
  if (!isLinux()) {
    return null;
  }
  return detectPasswordStore();
};
