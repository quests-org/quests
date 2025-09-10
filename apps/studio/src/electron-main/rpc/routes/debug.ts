import { pnpmVersion } from "@/electron-main/lib/pnpm";
import { base } from "@/electron-main/rpc/base";
import { eventIterator } from "@orpc/server";
import { app as electronApp } from "electron";
import * as pty from "node-pty";
import * as fs from "node:fs";
import * as os from "node:os";
import path from "node:path";
import { z } from "zod";

const BIN_PATH = electronApp.isPackaged
  ? path.join(process.resourcesPath, "app.asar.unpacked", "bin")
  : path.join(process.cwd(), "dev-bin");

const systemInfo = base.handler(async ({ context }) => {
  const pnpmVersionValue = await pnpmVersion();
  return [
    {
      title: "Node Version",
      value: process.version,
    },
    {
      title: "PNPM Version",
      value: pnpmVersionValue,
    },
    {
      title: "Workspace Root",
      value: context.workspaceConfig.rootDir,
    },
  ];
});

// Singleton PTY manager
class PtyManager {
  private _ptyProcess: null | pty.IPty = null;

  dispose(): void {
    if (this._ptyProcess) {
      this._ptyProcess.kill();
    }
    this._ptyProcess = null;
  }

  getPtyProcess(): pty.IPty {
    return this._ensurePtyProcess();
  }

  resize(cols: number, rows: number): void {
    const ptyProcess = this._ensurePtyProcess();
    ptyProcess.resize(cols, rows);
  }

  private _createPtyProcess(): void {
    const shell = os.platform() === "win32" ? "cmd.exe" : "/bin/bash";
    const args = os.platform() === "win32" ? [] : ["--noprofile", "--norc"];

    const binDir = BIN_PATH;

    const currentPath = process.env.PATH || "";
    // Prepended to ensure that our own binaries are found first
    const newPath = `${binDir}${path.delimiter}${currentPath}`;

    const colorEnv = {
      ...process.env,
      CLICOLOR: "1",
      ELECTRON_RUN_AS_NODE: "1",
      NODE_PATH: binDir,
      PATH: newPath,
    };

    const userDataDir = electronApp.getPath("userData");
    const workspaceDir = path.join(userDataDir, "workspace");
    const cwd = fs.existsSync(workspaceDir) ? workspaceDir : userDataDir;

    this._ptyProcess = pty.spawn(shell, args, {
      cols: 120,
      cwd,
      env: colorEnv,
      name: "xterm-256color",
      rows: 30,
    });

    this._ptyProcess.onExit(() => {
      this._ptyProcess = null;
    });
  }

  private _ensurePtyProcess(): pty.IPty {
    if (!this._ptyProcess) {
      this._createPtyProcess();
    }
    if (!this._ptyProcess) {
      throw new Error("Failed to create PTY process");
    }
    return this._ptyProcess;
  }
}

const ptyManager = new PtyManager();

const WriteToPtySchema = z.object({
  data: z.string(),
});

const writeToPty = base.input(WriteToPtySchema).handler(({ input }) => {
  const ptyProcess = ptyManager.getPtyProcess();
  ptyProcess.write(input.data);
  return { success: true };
});

const ResizePtySchema = z.object({
  cols: z.number(),
  rows: z.number(),
});

const resizePty = base.input(ResizePtySchema).handler(({ input }) => {
  ptyManager.resize(input.cols, input.rows);
  return { success: true };
});

const onPtyData = base
  .output(eventIterator(z.string()))
  .handler(async function* () {
    const ptyProcess = ptyManager.getPtyProcess();

    yield* (async function* () {
      while (true) {
        const output = await new Promise<string>((resolve) => {
          ptyProcess.onData((data) => {
            resolve(data);
          });
        });
        yield output;
      }
    })();
  });

export const debug = {
  onPtyData,
  resizePty,
  systemInfo,
  writeToPty,
};
