import {
  REGISTRY_DEV_DIR_PATH,
  REGISTRY_DIR_NAME,
} from "@/electron-main/constants";
import { getAIProviderConfigs } from "@/electron-main/lib/get-ai-provider-configs";
import { is } from "@electron-toolkit/utils";
import { aiGatewayApp } from "@quests/ai-gateway";
import {
  WORKSPACE_FOLDER,
  workspaceMachine,
  workspacePublisher,
} from "@quests/workspace/electron";
import { app, shell } from "electron";
import ms from "ms";
import path from "node:path";
import { createActor } from "xstate";

import { captureServerEvent } from "./capture-server-event";
import { captureServerException } from "./capture-server-exception";
import { getPNPMBinPath } from "./setup-bin-directory";

export function createWorkspaceActor() {
  const rootDir = path.join(app.getPath("userData"), WORKSPACE_FOLDER);
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
        : path.resolve(import.meta.dirname, REGISTRY_DEV_DIR_PATH),
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

  actor.subscribe((snapshot) => {
    // TODO: Move this into workspace itself
    workspacePublisher.publish("workspaceActor.snapshot", snapshot);
  });

  return { actor, workspaceConfig: actor.getSnapshot().context.config };
}
