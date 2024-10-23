import type * as z from "zod";

import { tool } from "ai";

import type { AgentTool, ToolName } from "./types";

export function createTool<
  TName extends ToolName,
  TInputSchema extends z.ZodType,
  TOutputSchema extends z.ZodType,
>(
  options: Omit<AgentTool<TName, TInputSchema, TOutputSchema>, "aiSDKTool"> & {
    name: TName;
  },
): AgentTool<TName, TInputSchema, TOutputSchema> {
  return {
    ...options,
    aiSDKTool: () =>
      // Ideally we wouldn't cast, but this isn't needed because the generic
      // is declared in the type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tool<any, any>({
        description: options.description,
        inputSchema: options.inputSchema,
        outputSchema: options.outputSchema,
        toModelOutput: (output: unknown) =>
          options.toModelOutput({ output: output as z.output<TOutputSchema> }),
        type: "function",
      }),
  };
}
