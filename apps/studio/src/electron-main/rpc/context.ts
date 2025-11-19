import {
  type WorkspaceActorRef,
  type WorkspaceConfig,
  type WorkspaceRPCContext,
} from "@quests/workspace/electron";

import { type InferContractRouterOutputs } from "@orpc/contract";
import { type StudioAppUpdater } from "../lib/update";
import { contract } from "../api/contract";

type Outputs = InferContractRouterOutputs<typeof contract>;

export interface InitialRPCContext extends WorkspaceRPCContext {
  appUpdater: StudioAppUpdater;
  cache: {
    user: Outputs["users"]["getMe"] | null;
    subscription: Outputs["users"]["getSubscriptionStatus"] | null;
  };
  webContentsId: number;
  workspaceConfig: WorkspaceConfig;
  workspaceRef: WorkspaceActorRef;
}
