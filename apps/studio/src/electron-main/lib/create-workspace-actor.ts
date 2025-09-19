import {
  REGISTRY_DEV_DIR_PATH,
  REGISTRY_DIR_NAME,
} from "@/electron-main/constants";
import { logger } from "@/electron-main/lib/electron-logger";
import { is } from "@electron-toolkit/utils";
import { aiGatewayApp, type AIGatewayProvider } from "@quests/ai-gateway";
import {
  WORKSPACE_FOLDER,
  workspaceMachine,
  workspacePublisher,
} from "@quests/workspace/electron";
import { app, shell } from "electron";
import { execa, parseCommandString } from "execa";
import { err, ok } from "neverthrow";
import path from "node:path";
import { createActor } from "xstate";

import { getProvidersStore } from "../stores/providers";
import { captureServerEvent } from "./capture-server-event";
import { captureServerException } from "./capture-server-exception";
import { getFramework } from "./frameworks";
import { getAllPackageBinaryPaths } from "./link-bins";
import { getPnpmPath } from "./pnpm";

const scopedLogger = logger.scope("workspace-actor");

export function createWorkspaceActor() {
  const rootDir = path.join(app.getPath("userData"), WORKSPACE_FOLDER);
  const execaEnv = {
    // Required for normal node processes to work
    // See https://www.electronjs.org/docs/latest/api/environment-variables
    ELECTRON_RUN_AS_NODE: "1",
  };
  const actor = createActor(workspaceMachine, {
    input: {
      aiGatewayApp,
      captureEvent: captureServerEvent,
      captureException: captureServerException,
      getAIProviders: () => {
        const providers: AIGatewayProvider.Type[] = [];
        const providersStore = getProvidersStore();
        const aiProviders = providersStore.get("providers");

        for (const provider of aiProviders) {
          providers.push({
            apiKey: provider.apiKey,
            baseURL: provider.baseURL,
            cacheIdentifier: provider.cacheIdentifier,
            type: provider.type,
          });
        }

        return providers;
      },
      previewCacheTimeMs: 60 * 60 * 1000 * 24, // 24 hours
      registryDir: app.isPackaged
        ? path.join(process.resourcesPath, REGISTRY_DIR_NAME)
        : path.resolve(import.meta.dirname, REGISTRY_DEV_DIR_PATH),
      rootDir,
      runPackageJsonScript: async ({ cwd, script, scriptOptions, signal }) => {
        const { framework, frameworkModulePath } = await getFramework({
          rootDir: cwd,
          script,
        });
        if (!framework) {
          return err(new Error(`Unsupported framework: ${script}`));
        }

        try {
          return ok(
            execa({
              cancelSignal: signal,
              cwd,
              env: {
                ...execaEnv,
                ...scriptOptions.env,
              },
              node: true,
            })`${frameworkModulePath} ${framework.args("dev", scriptOptions.port)}`,
          );
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
      },
      runShellCommand: async (command, { cwd, signal }) => {
        const [commandName, ...rest] = parseCommandString(command);
        const pnpmPath = getPnpmPath();

        if (commandName === "pnpm") {
          return ok(
            execa({
              cancelSignal: signal,
              cwd,
              env: execaEnv,
              node: true,
            })`${pnpmPath} ${rest}`,
          );
        }

        if (commandName === "tsc") {
          const binaryPaths = await getAllPackageBinaryPaths(cwd);
          const binPaths = binaryPaths.get("typescript");

          if (!binPaths) {
            return err(new Error(`tsc not found in ${cwd}`));
          }

          const modulePath = binPaths.find(
            (binPath) => path.basename(binPath) === "tsc",
          );

          if (!modulePath) {
            return err(new Error(`tsc not found in ${cwd}`));
          }

          return ok(
            execa({
              cancelSignal: signal,
              cwd,
              env: execaEnv,
              node: true,
            })`${modulePath} ${rest}`,
          );
        }

        return err(new Error(`Not implemented: ${command}`));
      },
      shimClientDir: app.isPackaged
        ? path.resolve(process.resourcesPath, "shim-client")
        : // Uncomment to test built shim
          // path.resolve(import.meta.dirname, "../../../../packages/shim-client/dist"),
          "dev-server",
      shimServerJSPath: app.isPackaged
        ? path.join(process.resourcesPath, "shim-server/index.cjs")
        : path.resolve("../../packages/shim-server/dist/index.cjs"),
      trashItem: (pathToTrash) => shell.trashItem(pathToTrash),
    },
    inspect(event) {
      if (!is.dev) {
        return;
      }
      switch (event.type) {
        case "@xstate.action": {
          if (
            !event.action.type.startsWith("xstate.") &&
            event.action.type !== "actions" &&
            event.action.type !== "publishLogs"
          ) {
            scopedLogger.info("action", event.action.type);
          }

          break;
        }
        case "@xstate.event": {
          if (!event.event.type.startsWith("xstate.")) {
            if (event.event.type === "taskEvent.tool-call-request-delta") {
              // Just log a single period per event with write not log
              process.stdout.write(".");
              return;
            }
            if (
              event.event.type === "workspaceServer.heartbeat" ||
              event.event.type === "spawnRuntime.log" ||
              event.event.type === "updateHeartbeat"
            ) {
              // Too verbose to log
              return;
            }
            scopedLogger.info(
              "event",
              event.event.type,
              "value" in event.event ? event.event.value : event.event,
            );
          }

          break;
        }
      }
    },
  });
  actor.start();

  actor.subscribe((snapshot) => {
    // TODO: Move this into workspace itself
    workspacePublisher.publish("workspaceActor.snapshot", snapshot);
  });

  return { actor, workspaceConfig: actor.getSnapshot().context.config };
}
