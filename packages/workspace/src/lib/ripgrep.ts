import { rgPath } from "@vscode/ripgrep";
import { spawn } from "node:child_process";

import { unpackAsarPath } from "./asar";

const RG_DISK_PATH = unpackAsarPath(rgPath);

interface RipgrepResult {
  code: null | number;
  stderr: string;
  stdout: string;
}

export function parseRipgrepLines(stdout: string): string[] {
  return stdout.trim().split(/\r?\n/).filter(Boolean);
}

export function spawnRipgrep({
  args,
  cwd,
  signal,
}: {
  args: string[];
  cwd?: string;
  signal: AbortSignal;
}): Promise<RipgrepResult> {
  return new Promise((resolve, reject) => {
    const ripgrep = spawn(RG_DISK_PATH, args, { cwd, signal });

    let stdout = "";
    let stderr = "";

    ripgrep.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    ripgrep.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    ripgrep.on("error", (error) => {
      reject(new Error(`Failed to execute ripgrep: ${error.message}`));
    });

    ripgrep.on("close", (code) => {
      resolve({ code, stderr, stdout });
    });
  });
}
