import type { ActorRefFrom } from "xstate";

import { assign, fromPromise, log, setup } from "xstate";

import { type AppConfig } from "../lib/app-config/types";
import { getCurrentDate } from "../lib/get-current-date";
import { Store } from "../lib/store";
import { type SessionMessagePart } from "../schemas/session/message-part";
import { getToolByType } from "../tools/all";

const executeToolLogic = fromPromise<
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  void,
  {
    appConfig: AppConfig;
    part: SessionMessagePart.ToolPartInputAvailable;
  }
>(async ({ input: { appConfig, part }, signal }) => {
  const tool = getToolByType(part.type);
  try {
    const output = await tool.execute({
      appConfig,
      input: part.input as never,
      signal,
    });

    if (signal.aborted) {
      return;
    }

    await (output.isOk()
      ? Store.savePart(
          {
            ...part,
            metadata: {
              ...part.metadata,
              endedAt: getCurrentDate(),
            },
            output: output.value as never,
            state: "output-available",
          },
          appConfig,
          { signal },
        )
      : Store.savePart(
          {
            ...part,
            errorText: output.error.message,
            metadata: {
              ...part.metadata,
              endedAt: getCurrentDate(),
            },
            state: "output-error",
          },
          appConfig,
          { signal },
        ));
    appConfig.workspaceConfig.captureEvent("llm.tool_executed", {
      success: output.isOk(),
      tool_name: part.type,
    });
  } catch (error) {
    await Store.savePart(
      {
        ...part,
        errorText: `Tool call execution failed for '${part.type}': ${error instanceof Error ? error.message : "Unknown error"}`,
        metadata: {
          ...part.metadata,
          endedAt: getCurrentDate(),
        },
        state: "output-error",
      },
      appConfig,
      { signal },
    );
  }
});

export const executeToolCallMachine = setup({
  actors: {
    cancelToolCallLogic: fromPromise<
      // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
      void,
      {
        appConfig: AppConfig;
        part: SessionMessagePart.ToolPartInputAvailable;
        reason: string;
      }
    >(async ({ input, signal }) => {
      await Store.savePart(
        {
          ...input.part,
          errorText: `Tool call execution was cancelled: ${input.reason}`,
          metadata: {
            ...input.part.metadata,
            endedAt: getCurrentDate(),
          },
          state: "output-error",
        },
        input.appConfig,
        { signal },
      );
    }),

    executeToolLogic,
  },

  delays: {
    toolCallTimeout: ({ context }) => {
      const tool = getToolByType(context.part.type);
      return typeof tool.timeoutMs === "function"
        ? tool.timeoutMs({
            input: context.part.input as never,
          })
        : tool.timeoutMs;
    },
  },

  types: {
    context: {} as {
      appConfig: AppConfig;
      cancellationReason: string;
      part: SessionMessagePart.ToolPartInputAvailable;
    },
    events: {} as { type: "stop" },
    input: {} as {
      appConfig: AppConfig;
      part: SessionMessagePart.ToolPartInputAvailable;
    },
  },
}).createMachine({
  context: ({ input }) => ({
    appConfig: input.appConfig,
    cancellationReason: "unknown",
    part: input.part,
  }),
  id: "executeToolCall",
  initial: "Executing",
  on: {
    stop: {
      actions: assign({ cancellationReason: "manual" }),
      target: ".Cancelling",
    },
  },
  states: {
    Cancelling: {
      invoke: {
        input: ({ context }) => ({
          appConfig: context.appConfig,
          part: context.part,
          reason: context.cancellationReason,
        }),
        onDone: "Done",
        onError: { actions: log(({ event }) => event.error), target: "Done" },
        src: "cancelToolCallLogic",
      },
    },

    Done: { type: "final" },

    Executing: {
      after: {
        toolCallTimeout: {
          actions: assign({ cancellationReason: "timeout" }),
          target: "Cancelling",
        },
      },
      invoke: {
        input: ({ context }) => ({
          appConfig: context.appConfig,
          part: context.part,
        }),
        onDone: "Done",
        onError: { actions: log(({ event }) => event.error), target: "Done" },
        src: "executeToolLogic",
      },
    },
  },
});

export type ExecuteToolCallActorRef = ActorRefFrom<
  typeof executeToolCallMachine
>;
