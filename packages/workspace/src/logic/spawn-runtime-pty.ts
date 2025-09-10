import { envForProviders } from "@quests/ai-gateway";
import { detect } from "detect-port";
import { parseCommandString } from "execa";
import * as pty from "node-pty";
import fs from "node:fs/promises";
import invariant from "tiny-invariant";
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
import {
  detectRuntimeTypeFromDirectory,
  getRuntimeConfigByType,
} from "./runtime-config";
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

interface PtyOptions {
  cwd: string;
  env: Record<string, string>;
}

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

async function runCommand(
  command: string,
  options: PtyOptions,
): Promise<{ output: string; success: boolean }> {
  return new Promise((resolve, reject) => {
    let output = "";

    const [cmd, ...args] = parseCommandString(command);
    if (!cmd) {
      reject(new Error("Command is required"));
      return;
    }

    const ptyProcess = pty.spawn(cmd, args, {
      cols: 120,
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      name: "xterm-256color",
      rows: 30,
    });

    ptyProcess.onData((data) => {
      output += data;
    });

    ptyProcess.onExit((event) => {
      const success = event.exitCode === 0;
      resolve({ output, success });
    });
  });
}

function runLongRunningCommand(
  command: string,
  options: PtyOptions,
  onData?: (data: string) => void,
): pty.IPty {
  const [cmd, ...args] = parseCommandString(command);
  invariant(cmd, "Command is required");

  const ptyProcess = pty.spawn(cmd, args, {
    cols: 120,
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    name: "xterm-256color",
    rows: 30,
  });

  if (onData) {
    ptyProcess.onData(onData);
  }

  return ptyProcess;
}

export const spawnRuntimePtyLogic = fromCallback<
  AnyEventObject,
  {
    appConfig: AppConfig;
    attempt: number;
    parentRef: ActorRef<AnyMachineSnapshot, SpawnRuntimeEvent>;
    shimServerJSPath: AbsolutePath;
  }
>(({ input: { appConfig, attempt, parentRef, shimServerJSPath } }) => {
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

  let devServerProcess: null | pty.IPty = null;

  async function main() {
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

    const runtimeType = await detectRuntimeTypeFromDirectory(appConfig.appDir);
    if (runtimeType === "unknown") {
      parentRef.send({
        type: "spawnRuntime.error.unsupported-script",
        value: {
          message: "Unsupported project type - no supported runtime detected",
        },
      });
      return;
    }

    const runtimeConfig = getRuntimeConfigByType(runtimeType);

    const detectedPort = await detect(port);
    if (detectedPort !== port) {
      releasePort(port);
      port = detectedPort;
      reservePort(port);
    }

    const providerEnv = envForProviders({
      providers: appConfig.workspaceConfig.getAIProviders(),
      workspaceServerURL: getWorkspaceServerURL(),
    });

    const runtimeEnv = runtimeConfig.envVars({ port });
    const env = {
      ...providerEnv,
      ...runtimeEnv,
      APP_BASE_URL: `http://${appConfig.subdomain}.${LOCAL_LOOPBACK_APPS_SERVER_DOMAIN}:${getWorkspaceServerPort()}`,
      NODE_OPTIONS: `--import ${esmImport(shimServerJSPath)}`,
      QUESTS_INSIDE_STUDIO: "true",
    };

    const ptyOptions: PtyOptions = {
      cwd: appConfig.appDir,
      env,
    };

    const installCommand = runtimeConfig.installCommand;
    if (installCommand) {
      try {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.log(`[Port ${port} install]: Starting installation...`);
        }
        const installResult = await runCommand(installCommand, ptyOptions);
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.log(`[Port ${port} install]:`, installResult.output.trim());
        }
        if (!installResult.success) {
          parentRef.send({
            type: "spawnRuntime.error.install-failed",
            value: {
              command: installCommand,
              message: installResult.output,
            },
          });
          return;
        }
      } catch (error) {
        parentRef.send({
          type: "spawnRuntime.error.install-failed",
          value: {
            command: installCommand,
            message:
              error instanceof Error ? error.message : "Unknown install error",
          },
        });
        return;
      }
    }

    const devServerCommand = await runtimeConfig.command({
      appDir: appConfig.appDir,
      port,
    });
    try {
      let shouldCheckServer = true;

      devServerProcess = runLongRunningCommand(
        devServerCommand,
        ptyOptions,
        (data) => {
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.log(`[Port ${port} dev server]:`, data.trim());
          }
        },
      );

      devServerProcess.onExit((event) => {
        shouldCheckServer = false;
        if (event.exitCode !== 0 && !signal.aborted) {
          parentRef.send({
            type: "spawnRuntime.error.unknown",
            value: {
              command: devServerCommand,
              message: `Dev server exited with code ${event.exitCode}`,
            },
          });
        } else {
          parentRef.send({
            type: "spawnRuntime.exited",
            value: { exitCode: event.exitCode },
          });
        }
      });

      const checkServer = async () => {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait a bit for dev server to start
        while (shouldCheckServer && !signal.aborted) {
          if (await isLocalServerRunning(port)) {
            shouldCheckServer = false;
            timeout.cancel();
            parentRef.send({ type: "spawnRuntime.started", value: { port } });
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      };

      await checkServer();

      await new Promise<void>((resolve) => {
        if (devServerProcess) {
          devServerProcess.onExit(() => {
            resolve();
          });
        }
      });
      return;
    } catch (error: unknown) {
      parentRef.send({
        type: "spawnRuntime.error.unknown",
        value: {
          command: devServerCommand,
          message:
            error instanceof Error ? error.message : "Script execution failed",
        },
      });
    }
  }

  main()
    .catch((error: unknown) => {
      if (error instanceof TimeoutError) {
        parentRef.send({
          type: "spawnRuntime.error.timeout",
          value: {
            message: error.message,
          },
        });
      } else if (!signal.aborted) {
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
      if (devServerProcess) {
        devServerProcess.kill();
      }
    });

  return () => {
    releasePort(port);
    timeout.cancel();
    abortController.abort();
    if (devServerProcess) {
      devServerProcess.kill();
    }
  };
});

export type SpawnRuntimePtyRef = ActorRefFrom<typeof spawnRuntimePtyLogic>;
