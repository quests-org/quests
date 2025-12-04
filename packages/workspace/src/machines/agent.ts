import { type AIGatewayLanguageModel } from "@quests/ai-gateway";
import { type Result } from "neverthrow";
import invariant from "tiny-invariant";
import {
  type ActorRef,
  type ActorRefFrom,
  type AnyMachineSnapshot,
  assign,
  fromPromise,
  raise,
  setup,
} from "xstate";

import { type AnyAgent } from "../agents/types";
import { type AppConfig } from "../lib/app-config/types";
import { createAssignEventError } from "../lib/assign-event-error";
import { getCurrentDate } from "../lib/get-current-date";
import { isInsufficientCreditsError } from "../lib/is-insufficient-credits-error";
import { isInteractiveTool } from "../lib/is-interactive-tool";
import { isToolPart } from "../lib/is-tool-part";
import { logUnhandledEvent } from "../lib/log-unhandled-event";
import { Store } from "../lib/store";
import { llmRequestLogic } from "../logic/llm-request";
import { type SessionMessagePart } from "../schemas/session/message-part";
import { StoreId } from "../schemas/store-id";
import { getToolByType, type ToolOutputByName } from "../tools/all";
import { type AnyAgentTool } from "../tools/types";
import {
  type ExecuteToolCallActorRef,
  executeToolCallMachine,
} from "./execute-tool-call";

export type AgentParentEvent =
  | {
      type: "agent.done";
      value: { error?: unknown };
    }
  | { type: "agent.paused" }
  | { type: "agent.resumed" }
  | {
      type: "agent.usingTool";
      value: AnyAgentTool;
    };

export type ToolCallUpdate =
  | { errorText: string; toolCallId: string; type: "error" }
  | {
      toolCallId: string;
      type: "success";
      value: ToolOutputByName;
    };

type AgentMachineEvent =
  | { error: Error; type: "error" }
  | { type: "executeToolCalls" }
  | { type: "llmRequest.chunkReceived" }
  | { type: "retry" }
  | { type: "stop" }
  | {
      type: "updateInteractiveToolCall";
      value: ToolCallUpdate;
    };

type AgentResult = Result<void, "agent-error:unknown">;

type ParentActorRef = ActorRef<AnyMachineSnapshot, AgentParentEvent>;

export const agentMachine = setup({
  actions: {
    assignEventError: createAssignEventError(),
  },

  actors: {
    executeToolCallMachine,

    llmRequestLogic,

    onFinish: fromPromise<
      // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
      void,
      {
        agent: AnyAgent;
        appConfig: AppConfig;
        model: AIGatewayLanguageModel;
        parentMessageId: StoreId.Message;
        sessionId: StoreId.Session;
      }
    >(async ({ input, signal }) => {
      await input.agent.onFinish({
        appConfig: input.appConfig,
        model: input.model,
        parentMessageId: input.parentMessageId,
        sessionId: input.sessionId,
        signal,
      });
    }),

    onStart: fromPromise<
      // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
      void,
      {
        agent: AnyAgent;
        appConfig: AppConfig;
        sessionId: StoreId.Session;
      }
    >(async ({ input, signal }) => {
      return input.agent.onStart({
        appConfig: input.appConfig,
        sessionId: input.sessionId,
        signal,
      });
    }),

    saveMaxStepsMessage: fromPromise<
      // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
      void,
      {
        appConfig: AppConfig;
        maxStepCount: number;
        sessionId: StoreId.Session;
      }
    >(async ({ input, signal }) => {
      const now = getCurrentDate();
      const messageId = StoreId.newMessageId();

      const result = await Store.saveMessageWithParts(
        {
          id: messageId,
          metadata: {
            createdAt: now,
            finishReason: "max-steps",
            modelId: "quests-synthetic",
            providerId: "system",
            sessionId: input.sessionId,
            synthetic: true,
          },
          parts: [
            {
              metadata: {
                createdAt: now,
                endedAt: now,
                id: StoreId.newPartId(),
                messageId,
                sessionId: input.sessionId,
              },
              text: `Agent stopped due to maximum steps (${input.maxStepCount}).`,
              type: "text",
            },
          ],
          role: "assistant",
        },
        input.appConfig,
        { signal },
      );

      if (result.isErr()) {
        throw new Error(
          `Failed to save max steps message: ${JSON.stringify(result.error)}`,
        );
      }
    }),

    shouldContinue: fromPromise<
      boolean,
      {
        agent: AnyAgent;
        appConfig: AppConfig;
        sessionId: StoreId.Session;
      }
    >(async ({ input, signal }) => {
      const messageResults = await Store.getMessagesWithParts(
        {
          appConfig: input.appConfig,
          sessionId: input.sessionId,
        },
        { signal },
      );

      if (messageResults.isErr()) {
        throw new Error(
          `Error loading messages: ${JSON.stringify(messageResults.error)}`,
        );
      }

      return input.agent.shouldContinue({
        messages: messageResults.value,
      });
    }),
  },

  delays: {
    llmRequestChunkTimeoutMs: ({ context }) => context.llmRequestChunkTimeoutMs,
    retryBackoff: ({ context }) => {
      return context.baseLLMRetryDelayMs * Math.pow(2, context.retryCount - 1);
    },
  },

  types: {
    context: {} as {
      agent: AnyAgent;
      appConfig: AppConfig;
      baseLLMRetryDelayMs: number;
      error?: unknown;
      llmRequestChunkTimeoutMs: number;
      maxRetryCount: number;
      maxStepCount: number;
      model: AIGatewayLanguageModel;
      parentMessageId: StoreId.Message;
      parentRef: ParentActorRef;
      pendingToolCalls: SessionMessagePart.ToolPartInputAvailable[];
      retryCount: number;
      sessionId: StoreId.Session;
      stepCount: number;
      toolCallExecuteRef: ExecuteToolCallActorRef | null;
      toolCallQueue: SessionMessagePart.ToolPartInputAvailable[];
      toolChoice?: "auto" | "none" | "required";
    },
    events: {} as AgentMachineEvent,
    input: {} as {
      agent: AnyAgent;
      appConfig: AppConfig;
      baseLLMRetryDelayMs: number;
      llmRequestChunkTimeoutMs: number;
      maxStepCount: number;
      model: AIGatewayLanguageModel;
      parentMessageId: StoreId.Message;
      parentRef: ParentActorRef;
      sessionId: StoreId.Session;
      toolChoice?: "auto" | "none" | "required";
    },
    output: {} as AgentResult,
  },
}).createMachine({
  context: ({ input }) => ({
    agent: input.agent,
    appConfig: input.appConfig,
    baseLLMRetryDelayMs: input.baseLLMRetryDelayMs,
    llmRequestChunkTimeoutMs: input.llmRequestChunkTimeoutMs,
    maxRetryCount: 3,
    maxStepCount: input.maxStepCount || 1,
    model: input.model,
    parentMessageId: input.parentMessageId,
    parentRef: input.parentRef,
    pendingToolCalls: [],
    retryCount: 0,
    sessionId: input.sessionId,
    stepCount: 0,
    toolCallExecuteRef: null,
    toolCallQueue: [],
    toolChoice: input.toolChoice,
  }),
  id: "agent",
  initial: "Starting",
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
    error: {
      target: ".Finishing",
    },
    stop: {
      actions: [
        ({ context }) => {
          if (context.toolCallExecuteRef) {
            context.toolCallExecuteRef.send({ type: "stop" });
          }
        },
      ],
      target: ".Finishing",
    },
    updateInteractiveToolCall: {
      actions: assign({
        pendingToolCalls: ({ context, event: { value } }) => {
          // TODO Only allow one match and use our ids
          const pendingToolCalls = context.pendingToolCalls.filter(
            (call) => call.toolCallId === value.toolCallId,
          );
          for (const pendingToolCall of pendingToolCalls) {
            // TODO Save these promises and handle them async in the state machine
            void Store.savePart(
              value.type === "success"
                ? {
                    ...pendingToolCall,
                    metadata: {
                      ...pendingToolCall.metadata,
                      endedAt: new Date(),
                    },
                    output: value.value.output as never,
                    state: "output-available",
                  }
                : {
                    ...pendingToolCall,
                    errorText: value.errorText,
                    metadata: {
                      ...pendingToolCall.metadata,
                      endedAt: new Date(),
                    },
                    state: "output-error",
                  },
              context.appConfig,
            );
          }
          return context.pendingToolCalls.filter(
            (call) => call.toolCallId !== value.toolCallId,
          );
        },
      }),
    },
  },
  states: {
    Done: {
      // Note: We could use type: "done" here, but we don't want to trigger
      // the XState "done" event when the agent is stopped, which logs a warning.
      entry: ({ context }) => {
        context.parentRef.send({
          type: "agent.done",
          value: { error: context.error },
        });
      },
    },

    ExecutingToolCall: {
      invoke: {
        input: ({ context }) => {
          const [nextToolCall] = context.toolCallQueue;
          invariant(nextToolCall, "No tool call to execute");
          const tool = getToolByType(nextToolCall.type);
          context.parentRef.send({
            type: "agent.usingTool",
            value: tool,
          });
          return {
            appConfig: context.appConfig,
            part: nextToolCall,
          };
        },
        onDone: {
          actions: assign({
            toolCallExecuteRef: () => null,
            // Note: If we ever allow parallel tool calls, we'll need to filter
            // by id instead of just removing the first item.
            toolCallQueue: ({ context }) => {
              const [_, ...remainingQueue] = context.toolCallQueue;
              return remainingQueue;
            },
          }),
          target: "MaybeExecutingToolCalls",
        },
        onError: {
          actions: [
            "assignEventError",
            assign({
              toolCallExecuteRef: () => null,
            }),
          ],
          target: "MaybeExecutingToolCalls",
        },
        src: "executeToolCallMachine",
      },
    },

    Finishing: {
      invoke: {
        input: ({ context }) => ({
          agent: context.agent,
          appConfig: context.appConfig,
          model: context.model,
          parentMessageId: context.parentMessageId,
          sessionId: context.sessionId,
        }),
        onDone: "Done",
        onError: { actions: "assignEventError", target: "Done" },
        src: "onFinish",
      },
    },

    LLMStreaming: {
      initial: "PendingTimeout",
      invoke: {
        input: ({ context, self }) => {
          return {
            agent: context.agent,
            appConfig: context.appConfig,
            model: context.model,
            self,
            sessionId: context.sessionId,
            stepCount: context.stepCount,
            toolChoice: context.toolChoice,
          };
        },
        onDone: {
          actions: [
            raise(({ event: { output } }) => {
              const { message } = output;

              if (message.metadata.error?.kind === "aborted") {
                return { type: "stop" };
              }

              if (message.metadata.error?.kind === "unknown") {
                return {
                  error: new Error(message.metadata.error.message),
                  type: "error",
                };
              }

              if (isInsufficientCreditsError(message)) {
                return { type: "stop" };
              }

              const hasRetryableError =
                message.metadata.error?.kind === "api-call" ||
                message.metadata.error?.kind === "no-such-tool" ||
                message.metadata.error?.kind === "invalid-tool-input";

              if (hasRetryableError) {
                return { type: "retry" };
              }

              return { type: "executeToolCalls" };
            }),
            assign(({ event: { output } }) => {
              const { message, parts } = output;
              const hasRetryableError =
                message.metadata.error?.kind === "api-call" ||
                message.metadata.error?.kind === "no-such-tool" ||
                message.metadata.error?.kind === "invalid-tool-input";
              if (hasRetryableError) {
                return {};
              }

              const pendingToolCalls: SessionMessagePart.ToolPartInputAvailable[] =
                [];
              const toolCallQueue: SessionMessagePart.ToolPartInputAvailable[] =
                [];

              for (const part of parts) {
                if (!isToolPart(part)) {
                  continue;
                }

                if (part.state !== "input-available") {
                  continue;
                }

                const tool = getToolByType(part.type);

                if (isInteractiveTool(tool.name)) {
                  pendingToolCalls.push(part);
                  continue;
                }

                // Add to queue for sequential execution
                toolCallQueue.push(part);
              }

              return { pendingToolCalls, toolCallQueue };
            }),
          ],
        },
        onError: { actions: "assignEventError", target: "Finishing" },
        src: "llmRequestLogic",
      },
      on: {
        executeToolCalls: {
          actions: assign({ retryCount: 0 }),
          target: "MaybeExecutingToolCalls",
        },
        retry: [
          {
            actions: assign({
              retryCount: ({ context }) => context.retryCount + 1,
            }),
            guard: ({ context }) => {
              return context.retryCount + 1 < context.maxRetryCount;
            },
            target: "RetryingWithDelay",
          },
          {
            target: "Finishing",
          },
        ],
      },
      states: {
        PendingTimeout: {
          after: {
            llmRequestChunkTimeoutMs: {
              actions: raise({ type: "retry" }),
            },
          },
          on: {
            "llmRequest.chunkReceived": "ResettingTimeout",
          },
        },
        ResettingTimeout: {
          always: "PendingTimeout",
        },
      },
    },

    MaybeContinuing: {
      invoke: {
        input: ({ context }) => ({
          agent: context.agent,
          appConfig: context.appConfig,
          sessionId: context.sessionId,
        }),
        onDone: [
          {
            guard: ({ event: { output } }) => {
              return output;
            },
            target: "MaybeStartingLLMRequest",
          },
          { target: "Finishing" },
        ],
        onError: {
          actions: "assignEventError",
          target: "Finishing",
        },
        src: "shouldContinue",
      },
    },

    MaybeExecutingToolCalls: {
      always: [
        {
          guard: ({ context }) => context.toolCallQueue.length > 0,
          target: "ExecutingToolCall",
        },
        {
          // If no more tool calls and no current execution, move to next state
          guard: ({ context }) => {
            return (
              context.toolCallQueue.length === 0 && !context.toolCallExecuteRef
            );
          },
          target: "MaybeWaitingForPendingToolCalls",
        },
      ],
    },

    MaybeStartingLLMRequest: {
      always: [
        {
          actions: assign({
            stepCount: ({ context }) => context.stepCount + 1,
          }),
          guard: ({ context }) => {
            return context.stepCount + 1 <= context.maxStepCount;
          },
          target: "LLMStreaming",
        },
        {
          target: "SavingMaxStepsMessage",
        },
      ],
    },

    MaybeWaitingForPendingToolCalls: {
      always: [
        {
          guard: ({ context }) => {
            return context.pendingToolCalls.length > 0;
          },
          target: "WaitingForPendingToolCalls",
        },
        {
          target: "MaybeContinuing",
        },
      ],
    },

    RetryingWithDelay: {
      after: {
        retryBackoff: {
          target: "LLMStreaming",
        },
      },
    },

    SavingMaxStepsMessage: {
      invoke: {
        input: ({ context }) => ({
          appConfig: context.appConfig,
          maxStepCount: context.maxStepCount,
          sessionId: context.sessionId,
        }),
        onDone: "Finishing",
        onError: { actions: "assignEventError", target: "Finishing" },
        src: "saveMaxStepsMessage",
      },
    },

    Starting: {
      invoke: {
        input: ({ context }) => ({
          agent: context.agent,
          appConfig: context.appConfig,
          sessionId: context.sessionId,
        }),
        onDone: "MaybeStartingLLMRequest",
        onError: { actions: "assignEventError", target: "Finishing" },
        src: "onStart",
      },
    },

    WaitingForPendingToolCalls: {
      always: {
        guard: ({ context }) => {
          return context.pendingToolCalls.length === 0;
        },
        target: "MaybeContinuing",
      },
      entry: ({ context }) => {
        context.parentRef.send({ type: "agent.paused" });
      },
      exit: ({ context }) => {
        context.parentRef.send({ type: "agent.resumed" });
      },
    },
  },
});

export type AgentMachineActorRef = ActorRefFrom<typeof agentMachine>;
