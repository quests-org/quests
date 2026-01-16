import { type AIGatewayLanguageModel } from "@quests/ai-gateway";
import { alphabetical, isEqual } from "radashi";
import invariant from "tiny-invariant";
import {
  type ActorRef,
  type ActorRefFrom,
  type AnyMachineSnapshot,
  assign,
  fromPromise,
  log,
  setup,
} from "xstate";

import { type AnyAgent } from "../agents/types";
import { type AppConfig } from "../lib/app-config/types";
import { createAssignEventError } from "../lib/assign-event-error";
import { createSession } from "../lib/create-session";
import { logUnhandledEvent } from "../lib/log-unhandled-event";
import { Store } from "../lib/store";
import { publisher } from "../rpc/publisher";
import { type SessionTag } from "../schemas/app-state";
import { type SessionMessage } from "../schemas/session/message";
import { type StoreId } from "../schemas/store-id";
import {
  agentMachine,
  type AgentMachineActorRef,
  type AgentParentEvent,
  type ToolCallUpdate,
} from "./agent";

export interface SessionMachineParentEvent {
  type: "session.done";
  value: {
    actorId: string;
    appConfig: AppConfig;
    error?: unknown;
    usedNonReadOnlyTools: boolean;
  };
}

type ParentActorRef = ActorRef<AnyMachineSnapshot, SessionMachineParentEvent>;

type SessionMachineEvent =
  | AgentParentEvent
  | { type: "addMessage"; value: SessionMessage.UserWithParts }
  | { type: "done" }
  | { type: "error"; value: { message: string } }
  | { type: "stop" }
  | {
      type: "updateInteractiveToolCall";
      value: ToolCallUpdate;
    };

export const sessionMachine = setup({
  actions: {
    assignEventError: createAssignEventError(),

    clearAgentRef: assign({ agentRef: undefined }),

    markUsedNonReadOnlyTools: assign({ usedNonReadOnlyTools: true }),

    stopAgent: ({ context }) => {
      if (context.agentRef) {
        context.agentRef.send({ type: "stop" });
      }
    },
  },

  actors: {
    agentMachine,

    saveQueuedMessage: fromPromise<
      SessionMessage.WithParts,
      {
        appConfig: AppConfig;
        message: SessionMessage.UserWithParts;
        sessionId: StoreId.Session;
      }
    >(async ({ input, signal }) => {
      const hasMismatchedSessionId = input.message.parts.some(
        (part) => part.metadata.sessionId !== input.sessionId,
      );
      if (hasMismatchedSessionId) {
        throw new Error(
          `Session ID mismatch: expected ${input.sessionId}, found parts with different session IDs`,
        );
      }
      const result = await Store.saveMessageWithParts(
        input.message,
        input.appConfig,
        { signal },
      );
      if (result.isErr()) {
        throw new Error(result.error.message);
      }
      return result.value;
    }),

    updateSession: fromPromise<
      // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
      void,
      {
        appConfig: AppConfig;
        sessionId: StoreId.Session;
      }
    >(async ({ input: { appConfig, sessionId }, signal }) => {
      const existingSession = await Store.getSession(sessionId, appConfig, {
        signal,
      });
      if (existingSession.isErr()) {
        if (existingSession.error.type === "workspace-not-found-error") {
          const result = await createSession({
            appConfig,
            sessionId,
            signal,
          });
          if (result.isErr()) {
            throw new Error(
              `Failed to create session: ${result.error.message}`,
            );
          }
          return;
        } else {
          throw new Error(
            `Failed to get session: ${existingSession.error.message}`,
          );
        }
      } else {
        const result = await Store.saveSession(
          {
            ...existingSession.value,
            updatedAt: new Date(),
          },
          appConfig,
          { signal },
        );
        if (result.isErr()) {
          throw new Error(`Failed to update session: ${result.error.message}`);
        }
      }
    }),
  },
  guards: {
    isAgentRefActive: ({ context }) =>
      context.agentRef?.getSnapshot().status === "active",
  },
  types: {
    context: {} as {
      agent: AnyAgent;
      agentRef?: AgentMachineActorRef;
      appConfig: AppConfig;
      baseLLMRetryDelayMs: number;
      error?: unknown;
      llmRequestChunkTimeoutMs: number;
      maxStepCount: number;
      model: AIGatewayLanguageModel;
      parentRef: ParentActorRef;
      queuedMessages: SessionMessage.UserWithParts[];
      sessionId: StoreId.Session;
      subscription?: { unsubscribe: () => void };
      usedNonReadOnlyTools: boolean;
    },
    events: {} as SessionMachineEvent,
    input: {} as {
      agent: AnyAgent;
      appConfig: AppConfig;
      baseLLMRetryDelayMs: number;
      llmRequestChunkTimeoutMs: number;
      maxStepCount?: number;
      model: AIGatewayLanguageModel;
      parentRef: ParentActorRef;
      queuedMessages: SessionMessage.UserWithParts[];
      sessionId: StoreId.Session;
    },
    tags: {} as SessionTag,
  },
}).createMachine({
  context: ({ input, self }) => {
    let previousTags: string[] = [];

    const subscription = self.subscribe((snapshot) => {
      const currentTags = alphabetical([...snapshot.tags], (tag) => tag);

      if (!isEqual(currentTags, previousTags)) {
        publisher.publish("appState.session.tagsChanged", {
          sessionId: input.sessionId,
          subdomain: input.appConfig.subdomain,
        });
        previousTags = currentTags;
      }
    });

    publisher.publish("appState.session.added", {
      sessionId: input.sessionId,
      subdomain: input.appConfig.subdomain,
    });

    return {
      agent: input.agent,
      appConfig: input.appConfig,
      baseLLMRetryDelayMs: input.baseLLMRetryDelayMs,
      llmRequestChunkTimeoutMs: input.llmRequestChunkTimeoutMs,
      maxStepCount: input.maxStepCount ?? 50,
      model: input.model,
      parentRef: input.parentRef,
      queuedMessages: input.queuedMessages,
      sessionId: input.sessionId,
      subscription,
      usedNonReadOnlyTools: false,
    };
  },
  id: "session",
  initial: "UpdatingSession",
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
    addMessage: {
      actions: assign({
        queuedMessages: ({ context, event }) => [
          ...context.queuedMessages,
          event.value,
        ],
      }),
    },
    stop: {
      actions: log("Agent not running"),
    },
    updateInteractiveToolCall: [
      {
        actions: ({ context, event }) => {
          invariant(
            context.agentRef,
            "Agent ref does not exist when finishing tool call",
          );
          context.agentRef.send({
            type: "updateInteractiveToolCall",
            value: event.value,
          });
        },
        guard: ({ context }) => !!context.agentRef,
      },
      {
        actions: log("Agent ref does not exist when finishing tool call"),
      },
    ],
  },
  states: {
    Agent: {
      initial: "UsingReadOnlyTools",

      on: {
        "agent.done": {
          actions: ({ context, event }) => {
            if (event.value.error) {
              context.appConfig.workspaceConfig.captureException(
                event.value.error,
                { scopes: ["workspace"] },
              );
            }
          },
          target: ".AgentDone",
        },
        stop: [
          {
            actions: "stopAgent",
            guard: "isAgentRefActive",
            target: ".Stopping",
          },
          {
            target: ".AgentDone",
          },
        ],
      },

      onDone: "Done",

      states: {
        AgentDone: { type: "final" },

        Stopping: {
          after: {
            // Failsafe if agent never stops
            1000: "AgentDone",
          },
          always: [{ guard: "isAgentRefActive" }, { target: "AgentDone" }],
          on: {
            "agent.done": {
              actions: "clearAgentRef",
              target: "AgentDone",
            },
          },
        },

        UsingNonReadOnlyTools: {
          initial: "Running",
          on: {
            "agent.paused": ".Paused",
            "agent.resumed": ".Running",
            "agent.usingTool": {
              // No-op because we've already moved to this state
            },
          },
          states: {
            Paused: {
              tags: ["agent.paused"],
            },
            Running: {
              tags: ["agent.running"],
            },
          },
          tags: ["agent.using-non-read-only-tools"],
        },
        UsingReadOnlyTools: {
          initial: "Running",
          on: {
            "agent.paused": ".Paused",
            "agent.resumed": ".Running",
            "agent.usingTool": {
              // No-op because we've already moved to this state
            },
          },
          states: {
            Paused: {
              on: {
                "agent.usingTool": {
                  actions: "markUsedNonReadOnlyTools",
                  guard: ({ event }) => !event.value.readOnly,
                  target: "#session.Agent.UsingNonReadOnlyTools.Paused",
                },
              },
              tags: ["agent.paused"],
            },
            Running: {
              on: {
                "agent.usingTool": {
                  actions: "markUsedNonReadOnlyTools",
                  guard: ({ event }) => !event.value.readOnly,
                  target: "#session.Agent.UsingNonReadOnlyTools.Running",
                },
              },
              tags: ["agent.running"],
            },
          },
        },
      },
      tags: ["agent.alive"],
    },

    Done: {
      entry: ({ context, self }) => {
        if (context.subscription) {
          context.subscription.unsubscribe();
        }

        publisher.publish("appState.session.removed", {
          sessionId: context.sessionId,
          subdomain: context.appConfig.subdomain,
        });

        context.parentRef.send({
          type: "session.done",
          value: {
            actorId: self.id,
            appConfig: context.appConfig,
            error: context.error,
            usedNonReadOnlyTools: context.usedNonReadOnlyTools,
          },
        });
      },
      tags: ["agent.done"],
      type: "final",
    },

    ProcessingQueuedMessages: {
      always: [
        {
          guard: ({ context }) => {
            return context.queuedMessages.length > 0;
          },
          target: "SavingMessageAndSpawningAgent",
        },
        { target: "Done" },
      ],
      tags: ["agent.alive"],
    },

    SavingMessageAndSpawningAgent: {
      invoke: {
        input: ({ context }) => {
          const [message] = context.queuedMessages;
          invariant(message, "No message to save");
          return {
            appConfig: context.appConfig,
            message,
            sessionId: context.sessionId,
          };
        },
        onDone: {
          actions: [
            assign({
              agentRef: ({ context, event, self, spawn }) =>
                spawn("agentMachine", {
                  id: "agent",
                  input: {
                    agent: context.agent,
                    appConfig: context.appConfig,
                    baseLLMRetryDelayMs: context.baseLLMRetryDelayMs,
                    llmRequestChunkTimeoutMs: context.llmRequestChunkTimeoutMs,
                    maxStepCount: context.maxStepCount,
                    model: context.model,
                    parentMessageId: event.output.id,
                    parentRef: self,
                    sessionId: context.sessionId,
                  },
                }),
              queuedMessages: ({ context }) => {
                const [_, ...rest] = context.queuedMessages;
                return rest;
              },
            }),
          ],
          target: "Agent",
        },
        onError: {
          actions: "assignEventError",
          target: "Done",
        },
        src: "saveQueuedMessage",
      },
      tags: ["agent.alive"],
    },

    UpdatingSession: {
      invoke: {
        input: ({ context }) => ({
          appConfig: context.appConfig,
          sessionId: context.sessionId,
        }),
        onDone: {
          target: "ProcessingQueuedMessages",
        },
        onError: {
          actions: "assignEventError",
          target: "Done",
        },
        src: "updateSession",
      },
      tags: ["agent.alive"],
    },
  },
});

export type SessionActorRef = ActorRefFrom<typeof sessionMachine>;
