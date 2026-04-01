import { createRequire } from "node:module";
import { arch, platform } from "node:os";
import path from "node:path";

import { unpackAsarPath } from "./asar";

// In dev, electron-vite bakes in the absolute resolved bin/ directory since
// node_modules isn't alongside the output. In prod, it is null and we resolve
// at runtime via createRequire (node_modules is next to the bundle).
declare const __AGENT_BROWSER_BIN_DIR__: null | string;

const req = createRequire(import.meta.url);

// Via agent-browser/bin/agent-browser.js wrapper
function getBinaryName() {
  const os = platform();
  const cpuArch = arch();

  let osKey: string;
  switch (os) {
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
      throw new Error(`Unsupported platform: ${os}`);
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

  const ext = os === "win32" ? ".exe" : "";
  return `agent-browser-${osKey}-${archKey}${ext}`;
}

const binDir =
  __AGENT_BROWSER_BIN_DIR__ ??
  path.dirname(req.resolve("agent-browser/bin/agent-browser.js"));

export const AGENT_BROWSER_PATH = unpackAsarPath(
  path.join(binDir, getBinaryName()),
);
