import type { Tool } from "ai";

import { type LanguageModelV2ToolResultOutput } from "@ai-sdk/provider";
import { type AIGatewayModel } from "@quests/ai-gateway";
import { type Result } from "neverthrow";
import { type z } from "zod";

import type { ToolNameSchema } from "./name";

import { type AppConfig } from "../lib/app-config/types";
import { type ExecuteError } from "../lib/execute-error";

export interface AgentTool<
  TName extends ToolName,
  TInputSchema extends z.ZodType = z.ZodType,
  TOutputSchema extends z.ZodType = z.ZodType,
> {
  aiSDKTool: () => Tool<z.output<TInputSchema>, z.output<TOutputSchema>>;
  description: string;
  execute: (options: {
    appConfig: AppConfig;
    input: z.output<TInputSchema>;
    model: AIGatewayModel.Type;
    signal: AbortSignal;
  }) => Promise<ExecuteResult<z.output<TOutputSchema>>>;
  inputSchema: TInputSchema;
  name: TName;
  outputSchema: TOutputSchema;
  readOnly: boolean;
  timeoutMs: ((options: { input: z.output<TInputSchema> }) => number) | number;
  toModelOutput: (options: {
    input: z.output<TInputSchema>;
    output: z.output<TOutputSchema>;
    toolCallId: string;
  }) => LanguageModelV2ToolResultOutput;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyAgentTool = AgentTool<any, any, any>;

export type ToolName = z.output<typeof ToolNameSchema>;

type ExecuteResult<T> = Result<T, ExecuteError>;
