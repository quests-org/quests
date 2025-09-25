import { ulid } from "ulid";
import {
  type ActorRefFrom,
  assign,
  log,
  raise,
  setup,
  type SnapshotFrom,
  stopChild,
} from "xstate";
import { z } from "zod";

import { type AppConfig } from "../lib/app-config/types";
import { logUnhandledEvent } from "../lib/log-unhandled-event";
import {
  type SpawnRuntimeEvent,
  spawnRuntimeLogic,
  type SpawnRuntimeRef,
} from "../logic/spawn-runtime";
import { publisher } from "../rpc/publisher";
import { type AppStatus, type RunPackageJsonScript } from "../types";

const MAX_RETRIES = 3;

export const RuntimeLogEntrySchema = z.object({
  createdAt: z.date(),
  id: z.ulid(),
  message: z.string(),
  type: z.enum(["error", "normal"]),
});

type RuntimeEvent =
  | SpawnRuntimeEvent
  | { type: "appendError"; value: { error: Error } }
  | { type: "clearLogs" }
  | { type: "fail" }
  | { type: "maybeRetry" }
  | { type: "restart" }
  | { type: "updateHeartbeat"; value: { createdAt: number } };

type RuntimeLogEntry = z.output<typeof RuntimeLogEntrySchema>;

function errorToString(error: Error): string {
  const parts: string[] = [];

  if (error.name && error.name !== "Error") {
    parts.push(`${error.name}:`);
  }

  if (error.message) {
    parts.push(error.message);
  }

  if (error.cause) {
    const causeStr =
      error.cause instanceof Error
        ? errorToString(error.cause)
        : // eslint-disable-next-line @typescript-eslint/no-base-to-string
          String(error.cause);

    parts.push(`(caused by: ${causeStr})`);
  }

  if (error.stack && error.stack !== error.message) {
    parts.push(`\nStack: ${error.stack}`);
  }

  return parts.join(" ");
}

export const runtimeMachine = setup({
  actions: {
    appendErrorToLogs: assign({
      logs: ({ context }, { value }: { value: { error: Error } }) => [
        ...context.logs,
        {
          createdAt: new Date(),
          id: ulid(),
          message: errorToString(value.error),
          type: "error" as const,
        },
      ],
    }),

    appendLog: assign({
      logs: (
        { context },
        { message, type }: { message: string; type: RuntimeLogEntry["type"] },
      ) => [
        ...context.logs,
        { createdAt: new Date(), id: ulid(), message, type },
      ],
    }),

    publishLogs: ({ context }) => {
      publisher.publish("runtime.log.updated", {
        subdomain: context.appConfig.subdomain,
      });
    },

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
      lastHeartbeat: Date;
      logs: RuntimeLogEntry[];
      port?: number;
      retryCount: number;
      runPackageJsonScript: RunPackageJsonScript;
      spawnRuntimeRef?: SpawnRuntimeRef;
    },
    events: {} as RuntimeEvent,
    input: {} as {
      appConfig: AppConfig;
      runPackageJsonScript: RunPackageJsonScript;
    },
    output: {} as { error?: unknown },
    tags: {} as Exclude<AppStatus, "not-found" | "unavailable">,
  },
}).createMachine({
  context: ({ input }) => {
    return {
      appConfig: input.appConfig,
      lastHeartbeat: new Date(),
      logs: [],
      retryCount: 0,
      runPackageJsonScript: input.runPackageJsonScript,
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
    appendError: {
      actions: [
        {
          params: ({ event }) => event,
          type: "appendErrorToLogs",
        },
        "publishLogs",
      ],
    },
    clearLogs: {
      actions: [assign({ logs: () => [] }), "publishLogs"],
    },
    fail: ".Error",
    maybeRetry: ".MaybeRetrying",
    restart: ".Restarting",
    "spawnRuntime.error.*": {
      actions: [
        {
          params: ({ event }) => event,
          type: "appendErrorToLogs",
        },
        "publishLogs",
        raise(({ event }) => {
          return event.isRetryable ? { type: "maybeRetry" } : { type: "fail" };
        }),
      ],
    },
    "spawnRuntime.exited": ".Stopped",
    "spawnRuntime.log": {
      actions: [
        assign({
          logs: ({ context, event }) => [
            ...context.logs,
            {
              createdAt: new Date(),
              id: ulid(),
              message: event.value.message,
              type: event.value.type,
            },
          ],
        }),
        "publishLogs",
      ],
    },
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
            logs: [],
            port: undefined,
            retryCount: 0,
            spawnRuntimeRef: undefined,
          })),
          {
            params: () => ({
              message: "Restarting server...",
              type: "normal",
            }),
            type: "appendLog",
          },
          "publishLogs",
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
          },
        }),
      })),
      on: {
        "spawnRuntime.started": {
          actions: [
            assign({
              port: ({ event }) => event.value.port,
            }),
            {
              params: () => ({
                message: "Server started",
                type: "normal",
              }),
              type: "appendLog",
            },
            "publishLogs",
          ],
          target: "Running",
        },
      },
      tags: "loading",
    },

    Stopped: {
      entry: [
        assign(() => ({
          port: undefined,
          retryCount: 0,
          spawnRuntimeRef: undefined,
        })),
      ],
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
export type RuntimeSnapshot = SnapshotFrom<typeof runtimeMachine>;
