import { captureServerException } from "@/electron-main/lib/capture-server-exception";
import { shell } from "electron";
import { exec, spawn } from "node:child_process";
import os from "node:os";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export async function openExternal(url: string) {
  if (os.platform() === "linux") {
    try {
      await execAsync("which xdg-open");
      // Workaround for https://github.com/electron/electron/issues/28436
      await new Promise<undefined>((resolve, reject) => {
        const env = { ...process.env };
        delete env.GDK_BACKEND;
        delete env.XDG_CURRENT_DESKTOP;

        const child = spawn("xdg-open", [url], {
          detached: true,
          env,
          stdio: "ignore",
        });

        child.on("error", (error) => {
          captureServerException(error);
          reject(error);
        });

        child.unref();
        resolve(undefined);
      });
      return;
    } catch {
      // xdg-open not available, fall back to shell.openExternal
    }
  }

  await shell.openExternal(url);
}
