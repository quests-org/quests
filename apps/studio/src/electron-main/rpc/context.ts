import {
  type WorkspaceActorRef,
  type WorkspaceConfig,
  type WorkspaceRPCContext,
} from "@quests/workspace/electron";

import { type StudioAppUpdater } from "../lib/update";

export interface InitialRPCContext extends WorkspaceRPCContext {
  appUpdater: StudioAppUpdater;
  hasToken: boolean;
  webContentsId: number;
  workspaceConfig: WorkspaceConfig;
  workspaceRef: WorkspaceActorRef;
}
