import { app } from "electron";
import os from "node:os";

export function getSystemProperties() {
  return {
    // Electron-specific
    chrome_version: process.versions.chrome,
    electron_version: process.versions.electron,
    is_packaged: app.isPackaged,
    node_version: process.version,

    // Follow PostHog conventions
    $device_type: "Desktop",
    $locale: app.getLocale(),
    $os:
      os.platform() === "darwin"
        ? "Mac OS X"
        : os.platform() === "win32"
          ? "Windows"
          : os.platform() === "linux"
            ? "Linux"
            : os.platform(),
    $os_version: os.release(),
  };
}
