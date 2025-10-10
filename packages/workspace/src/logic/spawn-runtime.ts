import { envForProviders } from "@quests/ai-gateway";
import { execa, ExecaError, type ResultPromise } from "execa";
import ms from "ms";
import path from "node:path";
import {
  type ActorRef,
  type ActorRefFrom,
  type AnyEventObject,
  type AnyMachineSnapshot,
  fromCallback,
} from "xstate";

import { type AppConfig } from "../lib/app-config/types";
import { cancelableTimeout, TimeoutError } from "../lib/cancelable-timeout";
import { pathExists } from "../lib/path-exists";
import { PortManager } from "../lib/port-manager";
import {
  detectRuntimeTypeFromDirectory,
  getRuntimeConfigByType,
} from "../lib/runtime-config";
import { getWorkspaceServerURL } from "./server/url";

const BASE_RUNTIME_TIMEOUT_MS = ms("1 minute");
const RUNTIME_TIMEOUT_MULTIPLIER_MS = ms("30 seconds");
const INSTALL_TIMEOUT_MS = ms("5 minutes");

const portManager = new PortManager({
  basePort: 9200,
  maxAttempts: 1000,
  retryDelayMs: ms("100ms"),
});

export type SpawnRuntimeEvent =
  | SpawnRuntimeEventError
  | {
      type: "spawnRuntime.exited";
    }
  | {
      type: "spawnRuntime.log";
      value: { message: string; type: "error" | "normal" };
    }
  | {
      type: "spawnRuntime.started";
      value: { port: number };
    };

interface SpawnRuntimeEventError {
  isRetryable: boolean;
  shouldLog: boolean;
  type:
    | "spawnRuntime.error.app-dir-does-not-exist"
    | "spawnRuntime.error.install-failed"
    | "spawnRuntime.error.package-json"
    | "spawnRuntime.error.port-taken"
    | "spawnRuntime.error.timeout"
    | "spawnRuntime.error.unknown"
    | "spawnRuntime.error.unsupported-script";
  value: { error: Error };
}

async function isLocalServerRunning(port: number) {
  try {
    await fetch(`http://localhost:${port}`);
    return true;
  } catch {
    return false;
  }
}

function sendProcessLogs(
  execaProcess: ResultPromise<{ cancelSignal: AbortSignal; cwd: string }>,
  parentRef: ActorRef<AnyMachineSnapshot, SpawnRuntimeEvent>,
  options: { errorOnly?: boolean } = {},
) {
  const { stderr, stdout } = execaProcess;

  stderr.on("data", (data: Buffer) => {
    const message = data.toString().trim();
    if (message) {
      if (
        process.env.NODE_ENV === "development" &&
        (message === "Debugger attached." ||
          message === "Waiting for the debugger to disconnect...")
      ) {
        // Filter debugger messages in development
        return;
      }
      parentRef.send({
        type: "spawnRuntime.log",
        value: { message, type: "error" },
      });
    }
  });

  if (!options.errorOnly) {
    stdout.on("data", (data: Buffer) => {
      const message = data.toString().trim();
      if (message) {
        parentRef.send({
          type: "spawnRuntime.log",
          value: { message, type: "normal" },
        });
      }
    });
  }
}
export const spawnRuntimeLogic = fromCallback<
  AnyEventObject,
  {
    appConfig: AppConfig;
    attempt: number;
    parentRef: ActorRef<AnyMachineSnapshot, SpawnRuntimeEvent>;
  }
>(({ input: { appConfig, attempt, parentRef } }) => {
  const abortController = new AbortController();
  const timeout = cancelableTimeout(
    BASE_RUNTIME_TIMEOUT_MS + attempt * RUNTIME_TIMEOUT_MULTIPLIER_MS,
  );

  let port: number | undefined;

  const baseEnv = {
    PATH: `${appConfig.workspaceConfig.binDir}${path.delimiter}${process.env.PATH || ""}`,
    // Required for normal node processes to work
    // See https://www.electronjs.org/docs/latest/api/environment-variables
    ELECTRON_RUN_AS_NODE: "1",
  };

  // TODO(FP-595): remove after done debugging
  const pnpmVersionProcess = execa({
    cwd: appConfig.appDir,
    env: baseEnv,
    windowsHide: true,
  })`pnpm --version`;
  sendProcessLogs(pnpmVersionProcess, parentRef);

  // TODO(FP-595): remove after done debugging
  const nodeVersionProcess = execa({
    cwd: appConfig.appDir,
    env: baseEnv,
    windowsHide: true,
  })`node --version`;
  sendProcessLogs(nodeVersionProcess, parentRef);

  // TODO(FP-595): remove after done debugging
  const whichPnpmProcess = execa({
    cwd: appConfig.appDir,
    env: baseEnv,
    windowsHide: true,
  })`which pnpm`;
  sendProcessLogs(whichPnpmProcess, parentRef);

  async function main() {
    port = await portManager.reservePort();

    if (!port) {
      parentRef.send({
        isRetryable: false,
        shouldLog: true,
        type: "spawnRuntime.error.unknown",
        value: { error: new Error("Failed to initialize port") },
      });
      return;
    }

    if (!(await pathExists(appConfig.appDir))) {
      parentRef.send({
        isRetryable: false,
        shouldLog: true,
        type: "spawnRuntime.error.app-dir-does-not-exist",
        value: {
          error: new Error(`App directory does not exist: ${appConfig.appDir}`),
        },
      });
      return;
    }

    const runtimeTypeResult = await detectRuntimeTypeFromDirectory(
      appConfig.appDir,
    );

    if (runtimeTypeResult.isErr()) {
      const { message, scriptName } = runtimeTypeResult.error;
      parentRef.send({
        isRetryable: false,
        shouldLog: true,
        type: scriptName
          ? "spawnRuntime.error.unsupported-script"
          : "spawnRuntime.error.package-json",
        value: {
          error: new Error(message),
        },
      });
      return;
    }

    const runtimeType = runtimeTypeResult.value;
    const runtimeConfig = getRuntimeConfigByType(runtimeType);

    const installTimeout = cancelableTimeout(INSTALL_TIMEOUT_MS);
    const installSignal = AbortSignal.any([
      abortController.signal,
      installTimeout.controller.signal,
    ]);
    const installCommand = runtimeConfig.installCommand(appConfig);

    parentRef.send({
      type: "spawnRuntime.log",
      value: {
        message: `$ ${installCommand.join(" ")}`,
        type: "normal",
      },
    });

    const installProcess = execa({
      cancelSignal: installSignal,
      cwd: appConfig.appDir,
      env: {
        ...baseEnv,
      },
      windowsHide: true,
    })`${installCommand}`;

    sendProcessLogs(installProcess, parentRef);
    await installProcess;
    installTimeout.cancel();

    const providerEnv = envForProviders({
      providers: appConfig.workspaceConfig.getAIProviders(),
      workspaceServerURL: getWorkspaceServerURL(),
    });

    const signal = AbortSignal.any([
      abortController.signal,
      timeout.controller.signal,
    ]);

    const devServerCommand = await runtimeConfig.command({
      appDir: appConfig.appDir,
      port,
    });

    parentRef.send({
      type: "spawnRuntime.log",
      value: { message: `$ ${devServerCommand.join(" ")}`, type: "normal" },
    });

    timeout.start();
    const runtimeProcess = execa({
      cancelSignal: signal,
      cwd: appConfig.appDir,
      env: {
        ...providerEnv,
        NO_COLOR: "1",
        QUESTS_INSIDE_STUDIO: "true",
        ...baseEnv,
      },
      windowsHide: true,
    })`${devServerCommand}`;
    sendProcessLogs(runtimeProcess, parentRef);

    let shouldCheckServer = true;
    const checkServer = async () => {
      await new Promise((resolve) => setTimeout(resolve, ms("500ms")));
      if (!port) {
        parentRef.send({
          isRetryable: true,
          shouldLog: false,
          type: "spawnRuntime.error.unknown",
          value: { error: new Error("Port not initialized") },
        });
        return;
      }

      if (timeout.controller.signal.aborted) {
        const timeoutError = new Error(
          "Timed out while waiting for server to start",
        );
        parentRef.send({
          isRetryable: true,
          shouldLog: true,
          type: "spawnRuntime.error.timeout",
          value: { error: timeoutError },
        });
        return;
      }
      if (signal.aborted) {
        parentRef.send({ type: "spawnRuntime.exited" });
        return;
      }
      if ((await isLocalServerRunning(port)) && shouldCheckServer) {
        shouldCheckServer = false;
        timeout.cancel();
        parentRef.send({ type: "spawnRuntime.started", value: { port } });
        return;
      } else {
        await checkServer();
      }
    };

    // Must abort check server if the process promise rejects because it
    // means the server is not running and we could accidentally check
    // another server and say it's running
    runtimeProcess.catch(() => (shouldCheckServer = false));

    // Ensures we catch errors from the process promise
    await Promise.all([checkServer(), runtimeProcess]);
  }

  main()
    .catch((error: unknown) => {
      if (error instanceof ExecaError) {
        if (error.failed) {
          if (error.cause instanceof TimeoutError) {
            const timeoutError = new Error(
              `Command ${error.command} timed out: ${error.cause.message}`,
            );
            parentRef.send({
              isRetryable: true,
              shouldLog: false,
              type: "spawnRuntime.error.timeout",
              value: {
                error: timeoutError,
              },
            });
          }
          if (error.isCanceled) {
            // Canceled by us, so we don't need to send anything
            return;
          }

          if (!port) {
            parentRef.send({
              isRetryable: true,
              shouldLog: false,
              type: "spawnRuntime.error.unknown",
              value: {
                error: new Error(`Port not initialized`, { cause: error }),
              },
            });
          } else if (error.message.includes(`Port ${port} is already in use`)) {
            parentRef.send({
              isRetryable: true,
              shouldLog: false,
              type: "spawnRuntime.error.port-taken",
              value: {
                error: new Error(
                  `Port ${port} is already in use: ${error.message}`,
                  { cause: error },
                ),
              },
            });
          } else if (error.exitCode === 143) {
            // Terminated by signal
            parentRef.send({ type: "spawnRuntime.exited" });
          } else {
            parentRef.send({
              isRetryable: true,
              shouldLog: false,
              type: "spawnRuntime.error.unknown",
              value: {
                error: new Error(
                  `Unknown error for command ${error.command}: ${error.message}`,
                  { cause: error },
                ),
              },
            });
          }
        } else {
          parentRef.send({
            isRetryable: true,
            shouldLog: false,
            type: "spawnRuntime.error.unknown",
            value: { error },
          });
        }
      } else {
        parentRef.send({
          isRetryable: true,
          shouldLog: false,
          type: "spawnRuntime.error.unknown",
          value: {
            error: new Error(
              error instanceof Error ? error.message : "Unknown error",
              { cause: error },
            ),
          },
        });
      }
    })
    .finally(() => {
      if (port) {
        portManager.releasePort(port);
      }
      timeout.cancel();
    });
  return () => {
    if (port) {
      portManager.releasePort(port);
    }
    timeout.cancel();
    abortController.abort();
  };
});

export type SpawnRuntimeRef = ActorRefFrom<typeof spawnRuntimeLogic>;
