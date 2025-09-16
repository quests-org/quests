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
import { esmImport } from "../lib/esm-import";
import { type AbsolutePath } from "../schemas/paths";
import { type RunPackageJsonScript } from "../types";
import { LOCAL_LOOPBACK_APPS_SERVER_DOMAIN } from "./server/constants";
import { getWorkspaceServerPort, getWorkspaceServerURL } from "./server/url";

const BASE_PORT = 9200;
const BASE_RUN_TIMEOUT_MS = 15_000;
const RUN_TIMEOUT_MULTIPLIER_MS = 5000;
const INSTALL_TIMEOUT_MS = 300_000;

// Port management system
const usedPorts = new Set<number>();

export type SpawnRuntimeEvent =
  | { type: "spawnRuntime.error.app-dir-does-not-exist"; value: RunErrorValue }
  | { type: "spawnRuntime.error.install-failed"; value: RunErrorValue }
  | { type: "spawnRuntime.error.package-json"; value: RunErrorValue }
  | { type: "spawnRuntime.error.port-taken"; value: RunErrorValue }
  | { type: "spawnRuntime.error.timeout"; value: RunErrorValue }
  | { type: "spawnRuntime.error.unknown"; value: RunErrorValue }
  | { type: "spawnRuntime.error.unsupported-script"; value: RunErrorValue }
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

interface RunErrorValue {
  command?: string;
  message: string;
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
    shimServerJSPath: AbsolutePath;
  }
>(
  ({
    input: {
      appConfig,
      attempt,
      parentRef,
      runPackageJsonScript,
      shimServerJSPath,
    },
  }) => {
    const abortController = new AbortController();
    const timeout = cancelableTimeout(
      BASE_RUN_TIMEOUT_MS + attempt * RUN_TIMEOUT_MULTIPLIER_MS,
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
        value: {
          message: `Installing dependencies (${installCommand})...`,
          type: "normal",
        },
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
          type: "spawnRuntime.error.install-failed",
          value: {
            message: installResult.error.message,
          },
        });
        return;
      }

      const installProcessPromise = installResult.value;
      sendProcessLogs(installProcessPromise, parentRef, { errorOnly: true });
      await installProcessPromise;

      parentRef.send({
        type: "spawnRuntime.log",
        value: {
          message: "Dependencies installed successfully",
          type: "normal",
        },
      });

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
        parentRef.send({
          type: "spawnRuntime.error.package-json",
          value: {
            message:
              error instanceof Error
                ? error.message
                : "Unknown error reading package.json",
          },
        });
        return;
      }

      const script = pkg.scripts?.[scriptName];
      if (!script) {
        throw new Error(`No script found: ${scriptName}`);
      }
      const [commandName] = parseCommandString(script);
      if (commandName !== "vite") {
        parentRef.send({
          type: "spawnRuntime.error.unsupported-script",
          value: {
            message: `Unsupported script: ${scriptName}`,
          },
        });
        return;
      }

      const exists = await fs
        .access(appConfig.appDir)
        .then(() => true)
        .catch(() => false);
      if (!exists) {
        parentRef.send({
          type: "spawnRuntime.error.app-dir-does-not-exist",
          value: {
            message: `App directory does not exist: ${appConfig.appDir}`,
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

      timeout.start();
      const result = await runPackageJsonScript({
        cwd: appConfig.appDir,
        script,
        scriptOptions: {
          env: {
            ...providerEnv,
            QUESTS_INSIDE_STUDIO: "true", // Used by apps to detect if they are running inside Studio
            // TODO: remove when Sentry is removed
            APP_BASE_URL: `http://${appConfig.subdomain}.${LOCAL_LOOPBACK_APPS_SERVER_DOMAIN}:${getWorkspaceServerPort()}`,
            NODE_OPTIONS: `--import ${esmImport(shimServerJSPath)}`,
          },
          port,
        },
        signal,
      });
      if (result.isErr()) {
        // Happens for immediate errors
        parentRef.send({
          type: "spawnRuntime.error.unknown",
          value: {
            message: result.error.message,
          },
        });
        return;
      }
      const processPromise = result.value;
      sendProcessLogs(processPromise, parentRef);

      let shouldCheckServer = true;
      const checkServer = async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (await isLocalServerRunning(port)) {
          if (shouldCheckServer) {
            shouldCheckServer = false;
            timeout.cancel();
            parentRef.send({ type: "spawnRuntime.started", value: { port } });
          }
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
              parentRef.send({
                type: "spawnRuntime.error.timeout",
                value: {
                  command: error.command,
                  message: error.cause.message,
                },
              });
            }
            if (error.isCanceled) {
              // Canceled by us, so we don't need to send anything
              return;
            }

            if (error.message.includes(`Port ${port} is already in use`)) {
              parentRef.send({
                type: "spawnRuntime.error.port-taken",
                value: {
                  command: error.command,
                  message: error.message,
                },
              });
            } else if (error.exitCode === 143) {
              // Terminated by signal
              parentRef.send({
                type: "spawnRuntime.exited",
                value: { exitCode: error.exitCode },
              });
            } else {
              parentRef.send({
                type: "spawnRuntime.error.unknown",
                value: {
                  command: error.command,
                  message: error.message,
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
          parentRef.send({
            type: "spawnRuntime.error.unknown",
            value: {
              message: error instanceof Error ? error.message : "Unknown error",
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
  },
);

export type SpawnRuntimeRef = ActorRefFrom<typeof spawnRuntimeLogic>;
