import { type Event as SentryEvent } from "@sentry/core";
import { type ActorRef, type MachineSnapshot } from "xstate";

import { type AppConfig } from "../../lib/app-config/types";
import { type RuntimeActorRef } from "../../machines/runtime";
import { type WorkspaceContext } from "../../machines/workspace/types";
import { type AbsolutePath } from "../../schemas/paths";
import { type AppSubdomain } from "../../schemas/subdomains";
import { type WorkspaceConfig } from "../../types";

export interface WorkspaceServerEnv {
  Variables: {
    getRuntimeRef: (subdomain: AppSubdomain) => RuntimeActorRef | undefined;
    parentRef: WorkspaceServerParentRef;
    shimClientDir: "dev-server" | AbsolutePath;
    workspaceConfig: WorkspaceConfig;
  };
}

export type WorkspaceServerParentEvent =
  | {
      type: "workspaceServer.appEvent";
      value: { sentryEvent: SentryEvent; subdomain: AppSubdomain };
    }
  | { type: "workspaceServer.error"; value: { error: Error } }
  | {
      type: "workspaceServer.heartbeat";
      value: {
        appConfig: AppConfig;
        createdAt: number;
        shouldCreate: boolean;
      };
    }
  | { type: "workspaceServer.started"; value: { port: number } };

export type WorkspaceServerParentRef = ActorRef<
  // Needed so we can access the types-safe context from the parent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MachineSnapshot<WorkspaceContext, any, any, any, any, any, any, any>,
  WorkspaceServerParentEvent
>;
