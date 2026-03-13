import type { ActorRefFrom } from "xstate";

import { type AIGatewayModel } from "@quests/ai-gateway";
import { assign, fromPromise, log, setup } from "xstate";

import { type AgentName } from "../agents/types";
import { type AppConfig } from "../lib/app-config/types";
import { getCurrentDate } from "../lib/get-current-date";
import { getProjectState } from "../lib/project-state-store";
import { type SpawnAgentFunction } from "../lib/spawn-agent";
import { Store } from "../lib/store";
import { streamTool } from "../lib/stream-tool";
import { type SessionMessagePart } from "../schemas/session/message-part";
import { getToolByType } from "../tools/all";

type CancellationReason = "manual" | "timeout" | "unknown";

const executeToolLogic = fromPromise<
  { preliminarySaved: boolean },
  {
    agentName: AgentName;
    appConfig: AppConfig;
    model: AIGatewayModel.Type;
    part: SessionMessagePart.ToolPartInputAvailable;
    spawnAgent: SpawnAgentFunction;
  }
>(
  async ({
    input: { agentName, appConfig, model, part, spawnAgent },
    signal,
  }) => {
    const tool = getToolByType(part.type);
    let preliminarySaved = false;
    try {
      const projectState = await getProjectState(appConfig.appDir);

      for await (const { output, type } of streamTool({
        execute: tool.execute,
        options: {
          agentName,
          appConfig,
          input: part.input as never,
          model,
          projectState,
          signal,
          spawnAgent,
        },
      })) {
        if (signal.aborted) {
          return { preliminarySaved };
        }

        if (type === "preliminary") {
          if (output.isOk()) {
            await Store.savePart(
              {
                ...part,
                metadata: { ...part.metadata, endedAt: getCurrentDate() },
                output: output.value as never,
                preliminary: true,
                state: "output-available",
              },
              appConfig,
              { signal },
            );
            preliminarySaved = true;
          }
        } else {
          await (output.isOk()
            ? Store.savePart(
                {
                  ...part,
                  metadata: { ...part.metadata, endedAt: getCurrentDate() },
                  output: output.value as never,
                  preliminary: false,
                  state: "output-available",
                },
                appConfig,
                { signal },
              )
            : Store.savePart(
                {
                  ...part,
                  errorText: output.error.message,
                  metadata: { ...part.metadata, endedAt: getCurrentDate() },
                  state: "output-error",
                },
                appConfig,
                { signal },
              ));
          appConfig.workspaceConfig.captureEvent("llm.tool_executed", {
            success: output.isOk(),
            tool_name: part.type,
          });
        }
      }
    } catch (error) {
      if (signal.aborted) {
        return { preliminarySaved };
      }
      await Store.savePart(
        {
          ...part,
          errorText: `Something went wrong while running '${part.type}': ${error instanceof Error ? error.message : "An unexpected error occurred"}`,
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
    return { preliminarySaved };
  },
);

export const executeToolCallMachine = setup({
  actors: {
    cancelToolCallLogic: fromPromise<
      // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
      void,
      {
        appConfig: AppConfig;
        part: SessionMessagePart.ToolPartInputAvailable;
        reason: CancellationReason;
      }
    >(async ({ input, signal }) => {
      await Store.savePart(
        {
          ...input.part,
          errorText: `This action was stopped${input.reason === "timeout" ? " because it took too long" : input.reason === "manual" ? " by you" : ""}.`,
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
      agentName: AgentName;
      appConfig: AppConfig;
      cancellationReason: CancellationReason;
      model: AIGatewayModel.Type;
      part: SessionMessagePart.ToolPartInputAvailable;
      spawnAgent: SpawnAgentFunction;
    },
    events: {} as { type: "stop" },
    input: {} as {
      agentName: AgentName;
      appConfig: AppConfig;
      model: AIGatewayModel.Type;
      part: SessionMessagePart.ToolPartInputAvailable;
      spawnAgent: SpawnAgentFunction;
    },
  },
}).createMachine({
  context: ({ input }) => ({
    agentName: input.agentName,
    appConfig: input.appConfig,
    cancellationReason: "unknown",
    model: input.model,
    part: input.part,
    spawnAgent: input.spawnAgent,
  }),
  id: "executeToolCall",
  initial: "Executing",
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
          agentName: context.agentName,
          appConfig: context.appConfig,
          model: context.model,
          part: context.part,
          spawnAgent: context.spawnAgent,
        }),
        onDone: [
          {
            guard: ({ context, event }) =>
              context.cancellationReason !== "unknown" &&
              !event.output.preliminarySaved,
            target: "Cancelling",
          },
          { target: "Done" },
        ],
        onError: { actions: log(({ event }) => event.error), target: "Done" },
        src: "executeToolLogic",
      },
      on: {
        stop: {
          actions: assign({ cancellationReason: "manual" }),
          target: "Cancelling",
        },
      },
    },
  },
});

export type ExecuteToolCallActorRef = ActorRefFrom<
  typeof executeToolCallMachine
>;
