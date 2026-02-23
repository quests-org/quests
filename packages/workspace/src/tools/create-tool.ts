import type * as z from "zod";

import { tool } from "ai";

import type { AgentName } from "../agents/types";
import type { AgentTool, ToolName } from "./types";

type CreateOptions<
  TName extends ToolName,
  TInputSchema extends z.ZodType,
  TOutputSchema extends z.ZodType,
> = Omit<
  AgentTool<TName, TInputSchema, TOutputSchema>,
  "aiSDKTool" | "inputSchema" | "name" | "outputSchema" | "staticAISDKTool"
>;

interface SetupOptions<
  TName extends ToolName,
  TInputSchema extends z.ZodType,
  TOutputSchema extends z.ZodType,
> {
  inputSchema: ((agentName: AgentName) => TInputSchema) | TInputSchema;
  name: TName;
  outputSchema: TOutputSchema;
}

export function setupTool<
  TName extends ToolName,
  TInputSchema extends z.ZodType,
  TOutputSchema extends z.ZodType,
>(setup: SetupOptions<TName, TInputSchema, TOutputSchema>) {
  return {
    create: (
      options: CreateOptions<TName, TInputSchema, TOutputSchema>,
    ): AgentTool<TName, TInputSchema, TOutputSchema> =>
      buildTool(setup, options),
  };
}

function buildTool<
  TName extends ToolName,
  TInputSchema extends z.ZodType,
  TOutputSchema extends z.ZodType,
>(
  setup: SetupOptions<TName, TInputSchema, TOutputSchema>,
  options: CreateOptions<TName, TInputSchema, TOutputSchema>,
): AgentTool<TName, TInputSchema, TOutputSchema> {
  return {
    ...setup,
    ...options,
    aiSDKTool: async ({ agentName, appConfig }) => {
      const description = await (typeof options.description === "function"
        ? options.description({ agentName, appConfig })
        : options.description);

      const inputSchema =
        typeof setup.inputSchema === "function"
          ? setup.inputSchema(agentName)
          : setup.inputSchema;

      return (
        // Ideally we wouldn't cast, but this isn't needed because the generic
        // is declared in the type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tool<any, any>({
          description,
          inputSchema,
          outputSchema: setup.outputSchema,
          toModelOutput: ({ input, output, toolCallId }) =>
            options.toModelOutput({
              input: input as z.output<TInputSchema>,
              output: output as z.output<TOutputSchema>,
              toolCallId,
            }),
          type: "function",
        })
      );
    },
    /**
     * Builds a description-free AI SDK tool shape used exclusively for
     * `toModelOutput` mapping in `prepareModelMessages`. Do not use this
     * for constructing tools passed to the LLM -- use `aiSDKTool` instead.
     */
    staticAISDKTool: () => {
      const inputSchema =
        typeof setup.inputSchema === "function"
          ? setup.inputSchema("main")
          : setup.inputSchema;

      return (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tool<any, any>({
          description: "", // None because this is never shown to agent
          inputSchema,
          outputSchema: setup.outputSchema,
          toModelOutput: ({ input, output, toolCallId }) =>
            options.toModelOutput({
              input: input as z.output<TInputSchema>,
              output: output as z.output<TOutputSchema>,
              toolCallId,
            }),
          type: "function",
        })
      );
    },
  };
}
