import { rgPath } from "@vscode/ripgrep";
import { spawn } from "node:child_process";
import path from "node:path";

// Fix the path to the ripgrep binary if it's in an .asar file
// via https://github.com/desktop/dugite/blob/0a316c7028f073ad05cea17fe219324e7ef13967/lib/git-environment.ts#L24
const RG_DISK_PATH = rgPath.replace(
  /[\\/]app.asar[\\/]/,
  `${path.sep}app.asar.unpacked${path.sep}`,
);

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
