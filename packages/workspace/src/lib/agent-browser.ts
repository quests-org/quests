import { createRequire } from "node:module";
import os, { arch, platform } from "node:os";
import path from "node:path";

import { unpackAsarPath } from "./asar";

// In dev, electron-vite bakes in the absolute resolved bin/ directory since
// node_modules isn't alongside the output. In prod, it is null and we resolve
// at runtime via createRequire (node_modules is next to the bundle).
declare const __AGENT_BROWSER_BIN_DIR__: null | string;

const req = createRequire(import.meta.url);

// Via agent-browser/bin/agent-browser.js wrapper
function getBinaryName() {
  const userPlatform = platform();
  const cpuArch = arch();

  let osKey: string;
  switch (userPlatform) {
    case "darwin": {
      osKey = "darwin";
      break;
    }
    case "linux": {
      osKey = "linux";
      break;
    }
    case "win32": {
      osKey = "win32";
      break;
    }
    default: {
      throw new Error(`Unsupported platform: ${userPlatform}`);
    }
  }

  let archKey: string;
  switch (cpuArch) {
    case "arm64": {
      archKey = "arm64";
      break;
    }
    case "x64": {
      archKey = "x64";
      break;
    }
    default: {
      throw new Error(`Unsupported architecture: ${cpuArch}`);
    }
  }

  const ext = userPlatform === "win32" ? ".exe" : "";
  return `agent-browser-${osKey}-${archKey}${ext}`;
}

const binDir =
  __AGENT_BROWSER_BIN_DIR__ ??
  path.dirname(req.resolve("agent-browser/bin/agent-browser.js"));

export const AGENT_BROWSER_PATH = unpackAsarPath(
  path.join(binDir, getBinaryName()),
);

// Fixed short path to avoid the OS unix socket path limit (~104/108 bytes on macOS/Linux)
// and prevent conflicts with other agent-browser instances on the system.
export const AGENT_BROWSER_SOCKET_DIR = path.join(
  os.tmpdir(),
  "quests-agent-browser",
);
