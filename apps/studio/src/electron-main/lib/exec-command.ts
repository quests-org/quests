import type { ForkOptions } from "node:child_process";

import { fork } from "node:child_process";

// Consider replacing with execa if it works the same
export async function forkExecCommand(
  modulePath: string,
  args?: string[],
  options?: ForkOptions,
  signal?: AbortSignal,
) {
  return new Promise<{
    exitCode: number;
    stderr: string;
    stdout: string;
  }>((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const child = fork(modulePath, args, {
      stdio: "pipe",
      ...options,
    });

    if (signal) {
      signal.addEventListener("abort", () => {
        child.kill();
      });
    }

    child.stdout?.on("data", (data) => {
      stdout += `${data}`;
    });

    child.stderr?.on("data", (data) => {
      stderr += `${data}`;
    });

    child.on("close", (code) => {
      resolve({ exitCode: code ?? 0, stderr, stdout });
    });

    // Must handle this error or Electron will show error window
    child.on("error", (err) => {
      reject(err);
    });
  });
}
