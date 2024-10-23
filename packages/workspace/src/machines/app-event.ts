import invariant from "tiny-invariant";
import {
  type ActorRef,
  type ActorRefFrom,
  type AnyMachineSnapshot,
  assign,
  setup,
} from "xstate";

import { appendAppEventLogic, type LogEntry } from "../logic/append-app-event";
import { type AppSubdomain } from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";

export interface AppEventParentEvent {
  type: "appEvent.error";
  value: {
    message: string;
  };
}

interface AppEventContext {
  config: WorkspaceConfig;
  logQueue: LogEntry[];
  parentRef: ActorRef<AnyMachineSnapshot, AppEventParentEvent>;
}

interface AppEventEvent {
  type: "appendLog";
  value: {
    message: string;
    subdomain: AppSubdomain;
  };
}

export const appEventMachine = setup({
  actions: {
    dequeueLog: assign({
      logQueue: ({ context }) => context.logQueue.slice(1),
    }),

    enqueueLog: assign({
      logQueue: ({ context, event }) => {
        return [
          ...context.logQueue,
          {
            message: event.value.message,
            subdomain: event.value.subdomain,
          },
        ];
      },
    }),
  },
  actors: {
    processLogLogic: appendAppEventLogic,
  },
  types: {
    context: {} as AppEventContext,
    events: {} as AppEventEvent,
    input: {} as {
      config: WorkspaceConfig;
      parentRef: ActorRef<AnyMachineSnapshot, AppEventParentEvent>;
    },
  },
}).createMachine({
  context: ({ input }) => ({
    config: input.config,
    logQueue: [],
    parentRef: input.parentRef,
  }),
  id: "appEvent",
  initial: "Idle",
  on: {
    appendLog: {
      actions: "enqueueLog",
    },
  },
  states: {
    Idle: {
      always: {
        guard: ({ context }) => context.logQueue.length > 0,
        target: "Processing",
      },
    },
    Processing: {
      invoke: {
        input: ({ context }) => {
          const log = context.logQueue[0];
          invariant(log, "Log queue is empty");
          return { config: context.config, log };
        },
        onDone: {
          actions: "dequeueLog",
          target: "Idle",
        },
        onError: {
          actions: [
            "dequeueLog",
            ({ context, event }) => {
              context.parentRef.send({
                type: "appEvent.error",
                value: {
                  message:
                    event.error instanceof Error
                      ? event.error.message
                      : String(event.error),
                },
              });
            },
          ],
          target: "Idle",
        },
        src: "processLogLogic",
      },
    },
  },
});

export type AppEventActorRef = ActorRefFrom<typeof appEventMachine>;
