import { serve } from "@hono/node-server";
import { type AIGatewayApp, type GetAIProviders } from "@quests/ai-gateway";
import {
  type CaptureEventFunction,
  type CaptureExceptionFunction,
} from "@quests/shared";
import { type LanguageModel } from "ai";
import path from "node:path";
import invariant from "tiny-invariant";
import {
  type ActorRefFrom,
  assign,
  enqueueActions,
  log,
  raise,
  setup,
  type SnapshotFrom,
} from "xstate";

import { AGENTS } from "../../agents/constants";
import { PREVIEWS_FOLDER, PROJECTS_FOLDER } from "../../constants";
import { createAppConfig } from "../../lib/app-config/create";
import { type AppConfig } from "../../lib/app-config/types";
import { createAssignEventError } from "../../lib/assign-event-error";
import { isProjectSubdomain } from "../../lib/is-app";
import { logUnhandledEvent } from "../../lib/log-unhandled-event";
import {
  checkoutVersionLogic,
  type CheckoutVersionParentEvent,
} from "../../logic/checkout-version";
import {
  createPreviewLogic,
  type CreatePreviewParentEvent,
} from "../../logic/create-preview";
import { workspaceServerLogic } from "../../logic/server";
import { type WorkspaceServerParentEvent } from "../../logic/server/types";
import {
  type AbsolutePath,
  AbsolutePathSchema,
  WorkspaceDirSchema,
} from "../../schemas/paths";
import { type SessionMessage } from "../../schemas/session/message";
import { type StoreId } from "../../schemas/store-id";
import { type AppSubdomain } from "../../schemas/subdomains";
import { type RunShellCommand } from "../../tools/types";
import { type WorkspaceConfig } from "../../types";
import { type ToolCallUpdate } from "../agent";
import { runtimeMachine } from "../runtime";
import { sessionMachine, type SessionMachineParentEvent } from "../session";
import { type WorkspaceContext } from "./types";

export type WorkspaceEvent =
  | CheckoutVersionParentEvent
  | CreatePreviewParentEvent
  | SessionMachineParentEvent
  | WorkspaceServerParentEvent
  | { type: "addAppBeingTrashed"; value: { subdomain: AppSubdomain } }
  | {
      type: "addMessage";
      value: {
        message: SessionMessage.UserWithParts;
        model: LanguageModel;
        sessionId: StoreId.Session;
        subdomain: AppSubdomain;
      };
    }
  | {
      type: "createSession";
      value: {
        message: SessionMessage.UserWithParts;
        model: LanguageModel;
        sessionId: StoreId.Session;
        subdomain: AppSubdomain;
      };
    }
  | {
      type: "internal.spawnSession";
      value: {
        appConfig: AppConfig;
        message: SessionMessage.UserWithParts;
        model: LanguageModel;
        sessionId: StoreId.Session;
      };
    }
  | { type: "removeAppBeingTrashed"; value: { subdomain: AppSubdomain } }
  | {
      type: "restartAllRuntimes";
    }
  | {
      type: "restartRuntime";
      value: { subdomain: AppSubdomain };
    }
  | {
      type: "spawnRuntime";
      value: { appConfig: AppConfig };
    }
  | {
      type: "stopRuntime";
      value: {
        includeChildren?: boolean;
        subdomain: AppSubdomain;
      };
    }
  | {
      type: "stopSessions";
      value: { subdomain: AppSubdomain };
    }
  | {
      type: "updateHeartbeat";
      value: { createdAt: number; subdomain: AppSubdomain };
    }
  | {
      type: "updateInteractiveToolCall";
      value: {
        subdomain: AppSubdomain;
        update: ToolCallUpdate;
      };
    };

export const workspaceMachine = setup({
  actions: {
    assignEventError: createAssignEventError(),

    clearSessionRefsBySubdomain: assign(
      ({ context }, { subdomain }: { subdomain: AppSubdomain }) => {
        const newsessionRefsBySubdomain = new Map<
          AppSubdomain,
          ActorRefFrom<typeof sessionMachine>[]
        >();

        for (const [
          sessionSubdomain,
          refs,
        ] of context.sessionRefsBySubdomain.entries()) {
          if (sessionSubdomain === subdomain) {
            continue;
          }
          if (
            isProjectSubdomain(subdomain) &&
            sessionSubdomain.endsWith(subdomain)
          ) {
            continue;
          }
          newsessionRefsBySubdomain.set(sessionSubdomain, refs);
        }

        return {
          sessionRefsBySubdomain: newsessionRefsBySubdomain,
        };
      },
    ),

    stopRuntime: enqueueActions(
      ({ context, enqueue }, { subdomain }: { subdomain: AppSubdomain }) => {
        const runtimeRef = context.runtimeRefs.get(subdomain);
        const remainingRefs = new Map(context.runtimeRefs);
        remainingRefs.delete(subdomain);
        if (runtimeRef) {
          enqueue.stopChild(runtimeRef);
          enqueue.assign({ runtimeRefs: remainingRefs });
        }
      },
    ),
  },

  actors: {
    checkoutVersionLogic,

    createPreviewLogic,

    runtimeMachine,

    sessionMachine,

    workspaceServerLogic,
  },

  types: {
    context: {} as WorkspaceContext,
    events: {} as WorkspaceEvent,
    input: {} as {
      aiGatewayApp: AIGatewayApp;
      captureEvent: CaptureEventFunction;
      captureException: CaptureExceptionFunction;
      getAIProviders: GetAIProviders;
      previewCacheTimeMs?: number;
      registryDir: string;
      rootDir: string;
      runPackageJsonScript: WorkspaceContext["runPackageJsonScript"];
      runShellCommand: RunShellCommand;
      shimClientDir: string;
      trashItem: (path: AbsolutePath) => Promise<void>;
    },
    output: {} as { error?: unknown },
  },
}).createMachine({
  context: ({ input, self, spawn }) => {
    const workspaceConfig: WorkspaceConfig = {
      captureEvent: input.captureEvent,
      captureException: input.captureException,
      getAIProviders: input.getAIProviders,
      previewCacheTimeMs: input.previewCacheTimeMs,
      previewsDir: AbsolutePathSchema.parse(
        path.join(input.rootDir, PREVIEWS_FOLDER),
      ),
      projectsDir: AbsolutePathSchema.parse(
        path.join(input.rootDir, PROJECTS_FOLDER),
      ),
      registryDir: AbsolutePathSchema.parse(input.registryDir),
      rootDir: WorkspaceDirSchema.parse(input.rootDir),
      runShellCommand: input.runShellCommand,
      trashItem: input.trashItem,
    };
    return {
      appsBeingTrashed: [],
      checkoutVersionRefs: new Map(),
      config: workspaceConfig,
      createPreviewRefs: new Map(),
      runPackageJsonScript: input.runPackageJsonScript,
      runtimeRefs: new Map(),
      sessionRefsBySubdomain: new Map(),
      workspaceServerRef: spawn("workspaceServerLogic", {
        input: {
          aiGatewayApp: input.aiGatewayApp,
          parentRef: self,
          serve,
          shimClientDir:
            input.shimClientDir === "dev-server"
              ? "dev-server"
              : AbsolutePathSchema.parse(input.shimClientDir),
          workspaceConfig,
        },
      }),
    };
  },
  id: "workspace",
  initial: "Running",
  on: {
    "*": {
      actions: ({ context, event, self }) => {
        logUnhandledEvent({
          captureException: context.config.captureException,
          event,
          self,
        });
      },
    },
    addAppBeingTrashed: {
      actions: [
        assign({
          appsBeingTrashed: ({ context, event }) => [
            ...context.appsBeingTrashed,
            event.value.subdomain,
          ],
        }),
        raise(({ event }) => {
          return {
            type: "stopRuntime",
            value: { includeChildren: true, subdomain: event.value.subdomain },
          };
        }),
        raise(({ event }) => {
          return {
            type: "stopSessions",
            value: { subdomain: event.value.subdomain },
          };
        }),
      ],
    },
    addMessage: [
      {
        actions: ({ context, event }) => {
          const subdomain = event.value.subdomain;
          const sessionRefs = context.sessionRefsBySubdomain.get(subdomain);

          // Send to existing session
          if (sessionRefs) {
            for (const sessionRef of sessionRefs) {
              sessionRef.send({
                type: "addMessage",
                value: event.value.message,
              });
            }
          }
        },
        guard: ({ context, event }) => {
          const subdomain = event.value.subdomain;
          const sessionRefs = context.sessionRefsBySubdomain.get(subdomain);
          const hasActiveSession = sessionRefs?.some(
            (ref) => ref.getSnapshot().status === "active",
          );
          return Boolean(hasActiveSession);
        },
      },
      {
        actions: raise(({ context, event }) => {
          const subdomain = event.value.subdomain;
          const appConfig = createAppConfig({
            subdomain,
            workspaceConfig: context.config,
          });
          return {
            type: "internal.spawnSession",
            value: {
              appConfig,
              message: event.value.message,
              model: event.value.model,
              sessionId: event.value.sessionId,
            },
          };
        }),
      },
    ],
    "checkoutVersion.done": {
      actions: assign(({ context, event }) => {
        const subdomain = event.value.appConfig.subdomain;
        const checkoutVersionRefs = new Map(context.checkoutVersionRefs);
        checkoutVersionRefs.delete(subdomain);
        return {
          checkoutVersionRefs,
        };
      }),
    },
    "createPreview.done": {
      actions: assign(({ context, event }) => {
        const subdomain = event.value.appConfig.subdomain;
        const createPreviewRefs = new Map(context.createPreviewRefs);
        createPreviewRefs.delete(subdomain);
        return { createPreviewRefs };
      }),
    },
    createSession: {
      actions: raise(({ context, event }) => {
        const appConfig = createAppConfig({
          subdomain: event.value.subdomain,
          workspaceConfig: context.config,
        });
        return {
          type: "internal.spawnSession",
          value: {
            appConfig,
            message: event.value.message,
            model: event.value.model,
            sessionId: event.value.sessionId,
          },
        };
      }),
    },
    "internal.spawnSession": {
      actions: [
        // Boot the runtime if it's not already running to ensure packages are
        // installed.
        raise(({ event }) => {
          const { appConfig } = event.value;
          return {
            type: "updateHeartbeat",
            value: {
              createdAt: Date.now(),
              subdomain: appConfig.subdomain,
            },
          };
        }),
        assign(({ context, event, self, spawn }) => {
          const { appConfig, message, model, sessionId } = event.value;
          const sessionMachineRef = spawn("sessionMachine", {
            input: {
              agent: AGENTS.code,
              appConfig,
              baseLLMRetryDelayMs: 1000, // 1 second
              llmRequestChunkTimeoutMs: 5 * 60 * 1000, // 5 minutes
              model,
              parentRef: self,
              queuedMessages: [message],
              sessionId,
            },
          });
          const existingSessionActorRefs =
            context.sessionRefsBySubdomain.get(appConfig.subdomain) ?? [];

          // Garbage collect done sessions
          const activeSessionActorRefs = existingSessionActorRefs.filter(
            (ref) => ref.getSnapshot().status !== "done",
          );
          const newsessionRefsBySubdomain = new Map(
            context.sessionRefsBySubdomain,
          );
          newsessionRefsBySubdomain.set(appConfig.subdomain, [
            ...activeSessionActorRefs,
            sessionMachineRef,
          ]);
          return {
            sessionRefsBySubdomain: newsessionRefsBySubdomain,
          };
        }),
      ],
      guard: ({ context, event }) => {
        const { subdomain } = event.value.appConfig;
        return !context.appsBeingTrashed.some(
          (trashingSubdomain) =>
            subdomain === trashingSubdomain ||
            // Includes sandboxes for projects being trashed
            subdomain.endsWith(trashingSubdomain),
        );
      },
    },
    removeAppBeingTrashed: {
      actions: assign(({ context, event }) => {
        return {
          appsBeingTrashed: context.appsBeingTrashed.filter(
            (subdomain) => subdomain !== event.value.subdomain,
          ),
        };
      }),
    },
    restartAllRuntimes: {
      actions: ({ context }) => {
        for (const runtimeRef of context.runtimeRefs.values()) {
          runtimeRef.send({ type: "restart" });
        }
      },
    },
    restartRuntime: [
      {
        actions: ({ context, event }) => {
          const { subdomain } = event.value;
          const runtimeRef = context.runtimeRefs.get(subdomain);
          runtimeRef?.send({ type: "restart" });
        },
        guard: ({ context, event }) => {
          const { subdomain } = event.value;
          return context.runtimeRefs.has(subdomain);
        },
      },
      {
        actions: raise(({ context, event }) => {
          const { subdomain } = event.value;
          const appConfig = createAppConfig({
            subdomain,
            workspaceConfig: context.config,
          });
          return {
            type: "spawnRuntime",
            value: { appConfig },
          };
        }),
        guard: ({ context, event }) => {
          const { subdomain } = event.value;
          return !context.runtimeRefs.has(subdomain);
        },
      },
    ],
    "session.done": [
      {
        actions: raise(({ event }) => {
          return {
            type: "restartRuntime",
            value: { subdomain: event.value.appConfig.subdomain },
          };
        }),
        guard: ({ event }) => event.value.usedNonReadOnlyTools,
      },
      {
        // No restart needed if only read-only tools were used
      },
      // TODO: Add this back once we have another way to show "done" sessions
      // in the UI because we want to garbage collect them eagerly.
      // actions: assign(({ context, event }) => {
      //   const { subdomain } = event.value.appConfig;
      //   const { [subdomain]: sessionActorRefs = [], ...otherRefs } =
      //     context.sessionRefsBySubdomain;
      //   const newSessionActorRefs = sessionActorRefs.filter(
      //     (ref) => ref.id !== event.value.actorId,
      //   );
      //   return {
      //     sessionRefsBySubdomain: {
      //       ...otherRefs,
      //       [subdomain]: newSessionActorRefs,
      //     },
      //   };
      // }),
    ],
    spawnRuntime: {
      actions: assign(({ context, event, spawn }) => {
        return {
          runtimeRefs: new Map(context.runtimeRefs).set(
            event.value.appConfig.subdomain,
            spawn("runtimeMachine", {
              input: {
                appConfig: event.value.appConfig,
                runPackageJsonScript: context.runPackageJsonScript,
              },
            }),
          ),
        };
      }),
      guard: ({ context, event }) => {
        const subdomain = event.value.appConfig.subdomain;
        return !context.appsBeingTrashed.some(
          (trashingSubdomain) =>
            subdomain === trashingSubdomain ||
            // Includes sandboxes for projects being trashed
            subdomain.endsWith(trashingSubdomain),
        );
      },
    },

    stopRuntime: {
      actions: enqueueActions(
        ({
          context,
          enqueue,
          event: {
            value: { includeChildren, subdomain },
          },
        }) => {
          enqueue({
            params: { subdomain },
            type: "stopRuntime",
          });
          if (includeChildren) {
            for (const [runtimeSubdomain] of context.runtimeRefs.entries()) {
              if (runtimeSubdomain.includes(subdomain)) {
                enqueue({
                  params: { subdomain: runtimeSubdomain },
                  type: "stopRuntime",
                });
              }
            }
          }
        },
      ),
    },

    stopSessions: {
      actions: ({ context, event }) => {
        const sessionActorRefs = context.sessionRefsBySubdomain.get(
          event.value.subdomain,
        );
        if (sessionActorRefs) {
          for (const sessionActorRef of sessionActorRefs) {
            sessionActorRef.send({ type: "stop" });
          }
        }
      },
    },

    updateHeartbeat: {
      actions: ({ context, event }) => {
        const runtimeRef = context.runtimeRefs.get(event.value.subdomain);
        if (runtimeRef) {
          runtimeRef.send({
            type: "updateHeartbeat",
            value: { createdAt: event.value.createdAt },
          });
        }
      },
    },

    updateInteractiveToolCall: [
      {
        actions: ({ context, event }) => {
          const subdomain = event.value.subdomain;
          const sessionRefs = context.sessionRefsBySubdomain.get(subdomain);
          if (!sessionRefs) {
            return;
          }
          for (const sessionRef of sessionRefs) {
            // TODO: Don't send to all sessions, just the one that has the tool call
            sessionRef.send({
              type: "updateInteractiveToolCall",
              value: event.value.update,
            });
          }
        },
        guard: ({ context, event }) => {
          const subdomain = event.value.subdomain;
          const sessionRefs = context.sessionRefsBySubdomain.get(subdomain);
          return !!sessionRefs && sessionRefs.length > 0;
        },
      },
      {
        actions: log(({ event }) => {
          return `No session refs found for subdomain: ${event.value.subdomain}`;
        }),
      },
    ],

    "workspaceServer.error": {
      actions: log(({ event }) => {
        return `Workspace server error: ${event.value.error.message}`;
      }),
    },

    "workspaceServer.heartbeat": [
      {
        actions: assign({
          createPreviewRefs: ({ context, event, self, spawn }) => {
            invariant(
              event.value.appConfig.type === "preview",
              "Expected preview app config",
            );
            const appConfig = event.value.appConfig;

            if (context.createPreviewRefs.has(appConfig.subdomain)) {
              // Already creating a preview for this app
              return context.createPreviewRefs;
            }

            const createPreviewRef = spawn("createPreviewLogic", {
              input: {
                appConfig,
                parentRef: self,
              },
            });

            return new Map(context.createPreviewRefs).set(
              appConfig.subdomain,
              createPreviewRef,
            );
          },
        }),
        guard: ({ event }) =>
          event.value.shouldCreate && event.value.appConfig.type === "preview",
      },
      {
        actions: assign({
          checkoutVersionRefs: ({ context, event, self, spawn }) => {
            invariant(
              event.value.appConfig.type === "version",
              "Expected version app config",
            );
            const appConfig = event.value.appConfig;

            if (context.checkoutVersionRefs.has(appConfig.subdomain)) {
              // Already creating a version for this app
              return context.checkoutVersionRefs;
            }

            const checkoutVersionRef = spawn("checkoutVersionLogic", {
              input: {
                appConfig,
                parentRef: self,
              },
            });

            return new Map(context.checkoutVersionRefs).set(
              appConfig.subdomain,
              checkoutVersionRef,
            );
          },
        }),
        guard: ({ event }) =>
          event.value.shouldCreate && event.value.appConfig.type === "version",
      },
      {
        actions: raise(({ context, event }) => {
          const existingRuntimeRef = context.runtimeRefs.get(
            event.value.appConfig.subdomain,
          );

          if (existingRuntimeRef) {
            return {
              type: "updateHeartbeat",
              value: {
                createdAt: event.value.createdAt,
                subdomain: event.value.appConfig.subdomain,
              },
            };
          }

          return {
            type: "spawnRuntime",
            value: {
              appConfig: event.value.appConfig,
            },
          };
        }),
      },
    ],

    "workspaceServer.started": {
      actions: log(({ event }) => {
        return `Workspace server started on port ${event.value.port}`;
      }),
    },
  },
  states: {
    Running: {},
  },
});

export type WorkspaceActorRef = ActorRefFrom<typeof workspaceMachine>;
export type WorkspaceSnapshot = SnapshotFrom<typeof workspaceMachine>;
