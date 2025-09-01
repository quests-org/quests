import type { LanguageModel } from "ai";

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
import { generateSessionTitle } from "../lib/generate-session-title";
import { logUnhandledEvent } from "../lib/log-unhandled-event";
import { Store } from "../lib/store";
import { llmRequestLogic } from "../logic/llm-request";
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

    llmRequestLogic,

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
    >(async ({ input, signal }) => {
      const existingSession = await Store.getSession(
        input.sessionId,
        input.appConfig,
        { signal },
      );
      if (existingSession.isErr()) {
        if (existingSession.error.type === "not-found") {
          // Create a new session with a date-based title
          const title = await generateSessionTitle(input.appConfig, { signal });
          const result = await Store.saveSession(
            {
              createdAt: new Date(),
              id: input.sessionId,
              title,
            },
            input.appConfig,
            { signal },
          );
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
      }
      const result = await Store.saveSession(
        {
          ...existingSession.value,
          updatedAt: new Date(),
        },
        input.appConfig,
        { signal },
      );
      if (result.isErr()) {
        throw new Error(`Failed to update session: ${result.error.message}`);
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
      cheapModel: LanguageModel;
      error?: unknown;
      llmRequestTimeoutMs: number;
      model: LanguageModel;
      parentRef: ParentActorRef;
      queuedMessages: SessionMessage.UserWithParts[];
      sessionId: StoreId.Session;
      usedNonReadOnlyTools: boolean;
    },
    events: {} as SessionMachineEvent,
    input: {} as {
      agent: AnyAgent;
      appConfig: AppConfig;
      cheapModel: LanguageModel;
      llmRequestTimeoutMs?: number;
      model: LanguageModel;
      parentRef: ParentActorRef;
      queuedMessages: SessionMessage.UserWithParts[];
      sessionId: StoreId.Session;
    },
    tags: {} as SessionTag,
  },
}).createMachine({
  context: ({ input }) => {
    return {
      agent: input.agent,
      appConfig: input.appConfig,
      cheapModel: input.cheapModel,
      llmRequestTimeoutMs: input.llmRequestTimeoutMs ?? 120_000,
      model: input.model,
      parentRef: input.parentRef,
      queuedMessages: input.queuedMessages,
      sessionId: input.sessionId,
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
                    cheapModel: context.cheapModel,
                    llmRequestTimeoutMs: context.llmRequestTimeoutMs,
                    maxStepCount: 25,
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
