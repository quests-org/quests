import { getAIProviderConfigs } from "@/electron-main/lib/get-ai-provider-configs";
import { is } from "@electron-toolkit/utils";
import { aiGatewayApp } from "@quests/ai-gateway";
import { workspaceMachine } from "@quests/workspace/electron";
import { app, shell } from "electron";
import ms from "ms";
import path from "node:path";
import { createActor } from "xstate";

import { captureServerEvent } from "./capture-server-event";
import { captureServerException } from "./capture-server-exception";
import { logger } from "./electron-logger";
import { getWorkspaceFolder } from "./get-workspace-folder";
import { getPNPMBinPath } from "./setup-bin-directory";

const REGISTRY_DIR_NAME = "registry";
let UNPACKAGED_REGISTRY_DIR = path.resolve(
  import.meta.dirname,
  `../../../../${REGISTRY_DIR_NAME}`,
);

const ENV_REGISTRY_DIR = import.meta.env.MAIN_VITE_QUESTS_REGISTRY_DIR_PATH;

if (ENV_REGISTRY_DIR) {
  const absolutePath = path.resolve(ENV_REGISTRY_DIR);
  logger.info("Using custom registry directory:", absolutePath);
  UNPACKAGED_REGISTRY_DIR = absolutePath;
}

export function createWorkspaceActor() {
  const rootDir = getWorkspaceFolder();
  const actor = createActor(workspaceMachine, {
    input: {
      aiGatewayApp,
      captureEvent: captureServerEvent,
      captureException: captureServerException,
      getAIProviderConfigs,
      nodeExecEnv: {
        // Required to allow Electron to operate as a node process
        // See https://www.electronjs.org/docs/latest/api/environment-variables
        ELECTRON_RUN_AS_NODE: "1",
      },
      pnpmBinPath: getPNPMBinPath(),
      previewCacheTimeMs: ms("24 hours"),
      registryDir: app.isPackaged
        ? path.join(process.resourcesPath, REGISTRY_DIR_NAME)
        : UNPACKAGED_REGISTRY_DIR,
      rootDir,
      shimClientDir: app.isPackaged
        ? path.resolve(process.resourcesPath, "shim-client")
        : // Uncomment to test built shim
          // path.resolve(import.meta.dirname, "../../../../packages/shim-client/dist"),
          "dev-server",
      trashItem: (pathToTrash) => shell.trashItem(pathToTrash),
    },
    inspect(event) {
      if (!is.dev) {
        return;
      }
      /* eslint-disable no-console */
      switch (event.type) {
        case "@xstate.action": {
          if (
            !event.action.type.startsWith("xstate.") &&
            event.action.type !== "actions" &&
            event.action.type !== "publishLogs"
          ) {
            console.groupCollapsed(
              `%c[XState Action] ${event.action.type}`,
              "color: #4caf50",
            );
            if (event.action.params) {
              console.log("params:", event.action.params);
            }
            console.groupEnd();
          }

          break;
        }
        case "@xstate.event": {
          if (!event.event.type.startsWith("xstate.")) {
            if (
              event.event.type === "llmRequest.chunkReceived" ||
              event.event.type.toLowerCase().includes("heartbeat") ||
              event.event.type === "spawnRuntime.log"
            ) {
              return;
            }

            const eventValue: unknown =
              "value" in event.event ? event.event.value : undefined;
            const hasDetails = eventValue !== undefined;

            if (hasDetails) {
              console.groupCollapsed(
                `%c[XState Event] ${event.event.type}`,
                "color: #9e9e9e",
              );
              console.log("value:", eventValue);
              console.groupEnd();
            } else {
              console.log(`%c[Event] ${event.event.type}`, "color: #9e9e9e");
            }
          }

          break;
        }
      }
      /* eslint-enable no-console */
    },
  });
  actor.start();

  const snapshot = actor.getSnapshot();
  if (snapshot.status === "error") {
    const error = new Error("Failed to create workspace actor", {
      cause: snapshot.error,
    });
    captureServerException(error, { scopes: ["studio"] });
    throw error;
  }
  return { actor, workspaceConfig: snapshot.context.config };
}
