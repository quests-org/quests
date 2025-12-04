import {
  REGISTRY_DEV_DIR_PATH,
  REGISTRY_DIR_NAME,
} from "@/electron-main/constants";
import { logger } from "@/electron-main/lib/electron-logger";
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

const scopedLogger = logger.scope("workspace-actor");

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
              event.event.type === "llmRequest.chunkReceived" ||
              event.event.type.toLowerCase().includes("heartbeat") ||
              event.event.type === "spawnRuntime.log"
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
