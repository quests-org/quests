import { envForProviders } from "@quests/ai-gateway";
import { detect } from "detect-port";
import { ExecaError, parseCommandString, type ResultPromise } from "execa";
import fs from "node:fs/promises";
import { type NormalizedPackageJson, readPackage } from "read-pkg";
import {
  type ActorRef,
  type ActorRefFrom,
  type AnyEventObject,
  type AnyMachineSnapshot,
  fromCallback,
} from "xstate";

import { type AppConfig } from "../lib/app-config/types";
import { cancelableTimeout, TimeoutError } from "../lib/cancelable-timeout";
import { type RunPackageJsonScript } from "../types";
import { getWorkspaceServerURL } from "./server/url";

const BASE_PORT = 9200;
const BASE_RUNTIME_TIMEOUT_MS = 60 * 1000; // 1 minute
const RUNTIME_TIMEOUT_MULTIPLIER_MS = 30 * 1000; // 30 seconds
const INSTALL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Port management system
const usedPorts = new Set<number>();

export type SpawnRuntimeEvent =
  | SpawnRuntimeEventError
  | {
      type: "spawnRuntime.exited";
      value: { exitCode?: number };
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

function findAvailablePort(): number {
  let port = BASE_PORT;
  while (usedPorts.has(port)) {
    port++;
  }
  return port;
}

async function isLocalServerRunning(port: number) {
  try {
    await fetch(`http://localhost:${port}`);
    return true;
  } catch {
    return false;
  }
}

function releasePort(port: number): void {
  usedPorts.delete(port);
}

function reservePort(port: number): void {
  usedPorts.add(port);
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
    runPackageJsonScript: RunPackageJsonScript;
  }
>(({ input: { appConfig, attempt, parentRef, runPackageJsonScript } }) => {
  const abortController = new AbortController();
  const timeout = cancelableTimeout(
    BASE_RUNTIME_TIMEOUT_MS + attempt * RUNTIME_TIMEOUT_MULTIPLIER_MS,
  );
  let port = findAvailablePort();
  reservePort(port);

  async function main() {
    const installTimeout = cancelableTimeout(INSTALL_TIMEOUT_MS);
    const installSignal = AbortSignal.any([
      abortController.signal,
      installTimeout.controller.signal,
    ]);
    const installCommand =
      appConfig.type === "version" || appConfig.type === "sandbox"
        ? // These app types are nested in the project directory, so we need
          // to ignore the workspace config otherwise PNPM may not install the
          // dependencies correctly
          "pnpm install --ignore-workspace"
        : "pnpm install";

    parentRef.send({
      type: "spawnRuntime.log",
      value: { message: `$ ${installCommand}`, type: "normal" },
    });

    const installResult = await appConfig.workspaceConfig.runShellCommand(
      installCommand,
      {
        cwd: appConfig.appDir,
        signal: installSignal,
      },
    );
    installTimeout.cancel();
    if (installResult.isErr()) {
      parentRef.send({
        isRetryable: true,
        type: "spawnRuntime.error.install-failed",
        value: {
          error: new Error(installResult.error.message, {
            cause: installResult.error,
          }),
        },
      });
      appConfig.workspaceConfig.captureException(installResult.error, {
        scopes: ["workspace"],
      });
      return;
    }

    const installProcessPromise = installResult.value;
    sendProcessLogs(installProcessPromise, parentRef);
    await installProcessPromise;

    // Use detect to check if port is actually available and get alternative if needed
    const detectedPort = await detect(port);
    if (detectedPort !== port) {
      // Release the reserved port and reserve the detected one
      releasePort(port);
      port = detectedPort;
      reservePort(port);
    }

    const scriptName = "dev";

    let pkg: NormalizedPackageJson;
    try {
      pkg = await readPackage({ cwd: appConfig.appDir });
    } catch (error) {
      const packageJsonError = new Error("Unknown error reading package.json", {
        cause: error instanceof Error ? error : new Error(String(error)),
      });
      appConfig.workspaceConfig.captureException(packageJsonError, {
        scopes: ["workspace"],
      });
      parentRef.send({
        isRetryable: false,
        type: "spawnRuntime.error.package-json",
        value: { error: packageJsonError },
      });
      return;
    }

    const script = pkg.scripts?.[scriptName];
    if (!script) {
      const error = new Error(`No script found: ${scriptName}`);
      appConfig.workspaceConfig.captureException(error, {
        scopes: ["workspace"],
      });
      parentRef.send({
        isRetryable: false,
        type: "spawnRuntime.error.package-json",
        value: { error },
      });
      return;
    }
    const [commandName] = parseCommandString(script);
    if (commandName !== "vite") {
      const error = new Error(`Unsupported script: ${scriptName}`);
      appConfig.workspaceConfig.captureException(error, {
        scopes: ["workspace"],
      });
      parentRef.send({
        isRetryable: false,
        type: "spawnRuntime.error.unsupported-script",
        value: { error },
      });
      return;
    }

    const exists = await fs
      .access(appConfig.appDir)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      const error = new Error(
        `App directory does not exist: ${appConfig.appDir}`,
      );
      appConfig.workspaceConfig.captureException(error, {
        scopes: ["workspace"],
      });
      parentRef.send({
        isRetryable: false,
        type: "spawnRuntime.error.app-dir-does-not-exist",
        value: { error },
      });
      return;
    }

    const providerEnv = envForProviders({
      providers: appConfig.workspaceConfig.getAIProviders(),
      workspaceServerURL: getWorkspaceServerURL(),
    });

    const signal = AbortSignal.any([
      abortController.signal,
      timeout.controller.signal,
    ]);

    parentRef.send({
      type: "spawnRuntime.log",
      value: { message: `$ pnpm run ${script}`, type: "normal" },
    });

    timeout.start();
    const result = await runPackageJsonScript({
      cwd: appConfig.appDir,
      script,
      scriptOptions: {
        env: {
          ...providerEnv,
          QUESTS_INSIDE_STUDIO: "true", // Used by apps to detect if they are running inside Studio
        },
        port,
      },
      signal,
    });
    if (result.isErr()) {
      // Happens for immediate errors
      appConfig.workspaceConfig.captureException(result.error, {
        scopes: ["workspace"],
      });
      parentRef.send({
        isRetryable: true,
        type: "spawnRuntime.error.unknown",
        value: {
          error: result.error,
        },
      });
      return;
    }
    const processPromise = result.value;
    sendProcessLogs(processPromise, parentRef);

    let shouldCheckServer = true;
    const checkServer = async () => {
      if (signal.aborted) {
        const timeoutError = new Error(
          "Timed out while waiting for server to start",
        );
        appConfig.workspaceConfig.captureException(timeoutError, {
          scopes: ["workspace"],
        });
        parentRef.send({
          isRetryable: true,
          type: "spawnRuntime.error.timeout",
          value: { error: timeoutError },
        });
        return;
      }

      if (!shouldCheckServer) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      if (await isLocalServerRunning(port)) {
        shouldCheckServer = false;
        timeout.cancel();
        parentRef.send({ type: "spawnRuntime.started", value: { port } });
        return;
      }
      await checkServer();
    };

    // Must abort check server if the process promise rejects because it
    // means the server is not running and we could accidentally check
    // another server and say it's running
    processPromise.catch(() => (shouldCheckServer = false));

    // Ensures we catch errors from the process promise
    await Promise.all([checkServer(), processPromise]);
  }

  main()
    .catch((error: unknown) => {
      if (error instanceof ExecaError) {
        if (error.failed) {
          if (error.cause instanceof TimeoutError) {
            const timeoutError = new Error(
              `Command ${error.command} timed out: ${error.cause.message}`,
            );
            appConfig.workspaceConfig.captureException(timeoutError, {
              scopes: ["workspace"],
            });
            parentRef.send({
              isRetryable: true,
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

          if (error.message.includes(`Port ${port} is already in use`)) {
            const portTakenError = new Error(
              `Port ${port} is already in use: ${error.message}`,
            );
            appConfig.workspaceConfig.captureException(error, {
              scopes: ["workspace"],
            });
            parentRef.send({
              isRetryable: true,
              type: "spawnRuntime.error.port-taken",
              value: {
                error: portTakenError,
              },
            });
          } else if (error.exitCode === 143) {
            // Terminated by signal
            parentRef.send({
              type: "spawnRuntime.exited",
              value: { exitCode: error.exitCode },
            });
          } else {
            const unknownError = new Error(
              `Unknown error for command ${error.command}: ${error.message}`,
            );
            parentRef.send({
              isRetryable: true,
              type: "spawnRuntime.error.unknown",
              value: {
                error: unknownError,
              },
            });
          }
        } else {
          parentRef.send({
            type: "spawnRuntime.exited",
            value: { exitCode: error.exitCode },
          });
        }
      } else {
        const unknownError = new Error(
          error instanceof Error ? error.message : "Unknown error",
        );
        appConfig.workspaceConfig.captureException(unknownError, {
          scopes: ["workspace"],
        });
        parentRef.send({
          isRetryable: true,
          type: "spawnRuntime.error.unknown",
          value: {
            error: unknownError,
          },
        });
      }
    })
    .finally(() => {
      releasePort(port);
      timeout.cancel();
    });
  return () => {
    releasePort(port);
    timeout.cancel();
    abortController.abort();
  };
});

export type SpawnRuntimeRef = ActorRefFrom<typeof spawnRuntimeLogic>;
