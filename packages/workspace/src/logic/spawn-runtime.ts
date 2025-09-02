import { envForProviders } from "@quests/ai-gateway";
import { detect } from "detect-port";
import { ExecaError, parseCommandString } from "execa";
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
const BASE_RUN_TIMEOUT = 15_000;
const RUN_TIMEOUT_MULTIPLIER = 5000;

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
      BASE_RUN_TIMEOUT + attempt * RUN_TIMEOUT_MULTIPLIER,
    );
    const signal = AbortSignal.any([
      abortController.signal,
      timeout.controller.signal,
    ]);

    let port = findAvailablePort();
    reservePort(port);

    async function main() {
      const installResult = await appConfig.workspaceConfig.runShellCommand(
        "pnpm install",
        {
          cwd: appConfig.appDir,
          signal,
        },
      );
      if (installResult.isErr()) {
        parentRef.send({
          type: "spawnRuntime.error.install-failed",
          value: {
            message: installResult.error.message,
          },
        });
        return;
      }
      await installResult.value;

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

      const providerEnv = await envForProviders({
        captureException: appConfig.workspaceConfig.captureException,
        providers: appConfig.workspaceConfig.getAIProviders(),
        workspaceServerURL: getWorkspaceServerURL(),
      });

      const result = await runPackageJsonScript({
        cwd: appConfig.appDir,
        script,
        scriptOptions: {
          env: {
            ...providerEnv,
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
      const { stderr, stdout } = processPromise;

      stderr.on("data", (data: Buffer) => {
        if (process.env.NODE_ENV !== "development") {
          return;
        }
        // eslint-disable-next-line no-console
        console.error(
          "\u001B[31m[Port %d stderr]\u001B[0m %s",
          port,
          data.toString().trim(),
        );
      });

      stdout.on("data", (data: Buffer) => {
        if (process.env.NODE_ENV !== "development") {
          return;
        }
        // eslint-disable-next-line no-console
        console.log(
          "\u001B[36m[Port %d stdout]\u001B[0m %s",
          port,
          data.toString().trim(),
        );
      });

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
