import { type InferContractRouterOutputs } from "@orpc/contract";
import {
  type WorkspaceActorRef,
  type WorkspaceConfig,
  type WorkspaceRPCContext,
} from "@quests/workspace/electron";

import { type contract } from "../api/contract";
import { type StudioAppUpdater } from "../lib/update";

export interface InitialRPCContext extends WorkspaceRPCContext {
  appUpdater: StudioAppUpdater;
  cache: {
    user: null | Outputs["users"]["getMe"];
  };
  webContentsId: number;
  workspaceConfig: WorkspaceConfig;
  workspaceRef: WorkspaceActorRef;
}

export type Outputs = InferContractRouterOutputs<typeof contract>;
