import { logger } from "@/electron-main/lib/electron-logger";
import { RPCHandler } from "@orpc/server/message-port";
import { fetchAISDKModel } from "@quests/ai-gateway";
import {
  type WorkspaceActorRef,
  type WorkspaceConfig,
} from "@quests/workspace/electron";
import { ipcMain } from "electron";
import { EventEmitter } from "node:events";

import { type StudioAppUpdater } from "../lib/update";
import { type InitialRPCContext } from "./context";
import { router } from "./routes";

// We expect more than the default of 10 active listeners
// due to long-lived message port subscriptions.
// Increased from the default of 10.
EventEmitter.defaultMaxListeners = 100;

const handler = new RPCHandler<InitialRPCContext>(router);

export function initializeRPC({
  appUpdater,
  workspaceConfig,
  workspaceRef,
}: {
  appUpdater: StudioAppUpdater;
  workspaceConfig: WorkspaceConfig;
  workspaceRef: WorkspaceActorRef;
}) {
  ipcMain.on("start-orpc-server", (event) => {
    const [serverPort] = event.ports;

    if (!serverPort) {
      logger.scope("rpc").error("No server port found");
      return;
    }

    const webContentsId = event.sender.id;

    handler.upgrade(serverPort, {
      context: {
        appUpdater,
        cache: { user: null },
        modelRegistry: {
          languageModel: fetchAISDKModel,
        },
        webContentsId,
        workspaceConfig,
        workspaceRef,
      },
    });
    serverPort.start();
  });
}
