import { type ActorRefFrom, assign, log, setup, stopChild } from "xstate";

import { type AppConfig } from "../lib/app-config/types";
import { logUnhandledEvent } from "../lib/log-unhandled-event";
import {
  type SpawnRuntimeEvent,
  spawnRuntimeLogic,
  type SpawnRuntimeRef,
} from "../logic/spawn-runtime";
import { type AbsolutePath } from "../schemas/paths";
import {
  type AppError,
  type AppStatus,
  type RunPackageJsonScript,
} from "../types";

const MAX_RETRIES = 3;

interface RunErrorValue {
  command?: string;
  message: string;
}

type RuntimeEvent =
  | SpawnRuntimeEvent
  | { type: "restart" }
  | { type: "saveError"; value: AppError }
  | { type: "updateHeartbeat"; value: { createdAt: number } };

export const runtimeMachine = setup({
  actions: {
    pushRuntimeErrorEvent: assign({
      errors: ({ context }, { value }: { value: RunErrorValue }) => [
        ...context.errors,
        {
          createdAt: Date.now(),
          message: value.command
            ? `${value.command}: ${value.message}`
            : value.message,
          type: "runtime" as const,
        },
      ],
    }),

    setLastHeartbeat: assign({
      lastHeartbeat: (_, { value }: { value: { createdAt: number } }) =>
        new Date(value.createdAt),
    }),

    stopRuntime: stopChild(({ context }) => context.spawnRuntimeRef ?? "none"),
  },

  actors: {
    spawnRuntimeLogic,
  },

  types: {
    context: {} as {
      appConfig: AppConfig;
      errors: AppError[];
      lastHeartbeat: Date;
      port?: number;
      retryCount: number;
      runPackageJsonScript: RunPackageJsonScript;
      shimServerJSPath: AbsolutePath;
      spawnRuntimeRef?: SpawnRuntimeRef;
    },
    events: {} as RuntimeEvent,
    input: {} as {
      appConfig: AppConfig;
      runPackageJsonScript: RunPackageJsonScript;
      shimServerJSPath: AbsolutePath;
    },
    output: {} as { error?: unknown },
    tags: {} as Exclude<AppStatus, "not-found" | "unavailable">,
  },
}).createMachine({
  context: ({ input }) => {
    return {
      appConfig: input.appConfig,
      errors: [],
      lastHeartbeat: new Date(),
      retryCount: 0,
      runPackageJsonScript: input.runPackageJsonScript,
      shimServerJSPath: input.shimServerJSPath,
    };
  },
  id: "runtime",
  initial: "SpawningRuntime",
  on: {
    "*": {
      actions: ({ context, event, self }) => {
        logUnhandledEvent({
          captureException: context.appConfig.workspaceConfig.captureException,
          event,
          self,
        });
      },
    },
    restart: ".Restarting",
    saveError: {
      actions: assign({
        errors: ({ context, event }) => [...context.errors, event.value],
      }),
    },
    "spawnRuntime.error.package-json": {
      actions: {
        params: ({ event }) => event,
        type: "pushRuntimeErrorEvent",
      },
      target: ".Error",
    },
    "spawnRuntime.error.port-taken": {
      actions: {
        params: ({ event }) => event,
        type: "pushRuntimeErrorEvent",
      },
      target: ".MaybeRetrying",
    },
    "spawnRuntime.error.timeout": {
      actions: {
        params: ({ event }) => event,
        type: "pushRuntimeErrorEvent",
      },
      target: ".MaybeRetrying",
    },
    "spawnRuntime.error.unknown": {
      actions: {
        params: ({ event }) => event,
        type: "pushRuntimeErrorEvent",
      },
      target: ".Error",
    },
    "spawnRuntime.error.unsupported-script": {
      actions: {
        params: ({ event }) => event,
        type: "pushRuntimeErrorEvent",
      },
      target: ".Error",
    },
    "spawnRuntime.exited": ".Stopped",
    updateHeartbeat: {
      actions: {
        params: ({ event }) => event,
        type: "setLastHeartbeat",
      },
    },
  },
  states: {
    Error: { tags: "error" },

    MaybeRetrying: {
      always: [
        {
          guard: ({ context }) => context.retryCount < MAX_RETRIES,
          target: "SpawningRuntime",
        },
        {
          actions: log("Hit max retries"),
          target: "Error",
        },
      ],
      entry: assign({
        retryCount: ({ context }) => context.retryCount + 1,
      }),
      tags: "loading",
    },

    PendingShutdown: {
      after: {
        5000: {
          actions: "stopRuntime",
          target: "Stopped",
        },
      },
      on: {
        updateHeartbeat: {
          actions: {
            params: ({ event }) => event,
            type: "setLastHeartbeat",
          },
          target: "Running",
        },
      },
      tags: "ready",
    },

    Restarting: {
      always: {
        actions: [
          "stopRuntime",
          assign(() => ({
            port: undefined,
            retryCount: 0,
            spawnRuntimeRef: undefined,
          })),
        ],
        target: "SpawningRuntime",
      },
      tags: "loading",
    },

    Running: {
      after: {
        30_000: "PendingShutdown",
      },
      tags: "ready",
    },

    SpawningRuntime: {
      entry: assign(({ context, self, spawn }) => ({
        spawnRuntimeRef: spawn("spawnRuntimeLogic", {
          input: {
            appConfig: context.appConfig,
            attempt: context.retryCount,
            parentRef: self,
            runPackageJsonScript: context.runPackageJsonScript,
            shimServerJSPath: context.shimServerJSPath,
          },
        }),
      })),
      on: {
        "spawnRuntime.started": {
          actions: assign({
            port: ({ event }) => event.value.port,
          }),
          target: "Running",
        },
      },
      tags: "loading",
    },

    Stopped: {
      entry: assign(() => ({
        port: undefined,
        retryCount: 0,
        spawnRuntimeRef: undefined,
      })),
      on: {
        updateHeartbeat: {
          actions: {
            params: ({ event }) => event,
            type: "setLastHeartbeat",
          },
          target: "Restarting",
        },
      },
      tags: "stopped",
    },
  },
});

export type RuntimeActorRef = ActorRefFrom<typeof runtimeMachine>;
