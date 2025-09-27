import { envForProviders } from "@quests/ai-gateway";
import { ExecaError, parseCommandString, type ResultPromise } from "execa";
import { type NormalizedPackageJson, readPackage } from "read-pkg";
import {
  type ActorRef,
  type ActorRefFrom,
  type AnyEventObject,
  type AnyMachineSnapshot,
  fromCallback,
} from "xstate";

import { INSTALL_TIMEOUT_MS } from "../constants";
import { type AppConfig } from "../lib/app-config/types";
import { cancelableTimeout, TimeoutError } from "../lib/cancelable-timeout";
import { pathExists } from "../lib/path-exists";
import { PortManager } from "../lib/port-manager";
import { type RunPackageJsonScript } from "../types";
import { getWorkspaceServerURL } from "./server/url";

const BASE_RUNTIME_TIMEOUT_MS = 60 * 1000; // 1 minute
const RUNTIME_TIMEOUT_MULTIPLIER_MS = 30 * 1000; // 30 seconds

const portManager = new PortManager({
  basePort: 9200,
  maxAttempts: 1000,
  retryDelayMs: 100,
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
    runPackageJsonScript: RunPackageJsonScript;
  }
>(({ input: { appConfig, attempt, parentRef, runPackageJsonScript } }) => {
  const abortController = new AbortController();
  const timeout = cancelableTimeout(
    BASE_RUNTIME_TIMEOUT_MS + attempt * RUNTIME_TIMEOUT_MULTIPLIER_MS,
  );

  let port: number | undefined;

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
        shouldLog: true,
        type: "spawnRuntime.error.install-failed",
        value: {
          error: new Error(installResult.error.message, {
            cause: installResult.error,
          }),
        },
      });
      return;
    }

    const installProcessPromise = installResult.value;
    sendProcessLogs(installProcessPromise, parentRef);
    await installProcessPromise;

    const scriptName = "dev";

    let pkg: NormalizedPackageJson;
    try {
      pkg = await readPackage({ cwd: appConfig.appDir });
    } catch (error) {
      parentRef.send({
        isRetryable: false,
        shouldLog: true,
        type: "spawnRuntime.error.package-json",
        value: {
          error: new Error("Unknown error reading package.json", {
            cause: error instanceof Error ? error : new Error(String(error)),
          }),
        },
      });
      return;
    }

    const script = pkg.scripts?.[scriptName];
    if (!script) {
      parentRef.send({
        isRetryable: false,
        shouldLog: true,
        type: "spawnRuntime.error.package-json",
        value: {
          error: new Error(`No script \`${scriptName}\` found in package.json`),
        },
      });
      return;
    }
    const [commandName] = parseCommandString(script);
    if (commandName !== "vite") {
      parentRef.send({
        isRetryable: false,
        shouldLog: true,
        type: "spawnRuntime.error.unsupported-script",
        value: {
          error: new Error(
            `Unsupported command \`${commandName ?? "missing"}\` for script \`${scriptName}\` in package.json`,
          ),
        },
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
      parentRef.send({
        isRetryable: true,
        shouldLog: false,
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
        parentRef.send({
          isRetryable: true,
          shouldLog: true,
          type: "spawnRuntime.error.timeout",
          value: { error: timeoutError },
        });
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      if (port && (await isLocalServerRunning(port)) && shouldCheckServer) {
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
