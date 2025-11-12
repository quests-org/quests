import os from "node:os";

export function getSystemInfo() {
  return `${os.platform()} ${os.release()}`;
}
