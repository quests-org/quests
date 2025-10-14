import type { Tool } from "ai";
import type { Result } from "neverthrow";

import { type LanguageModelV2ToolResultOutput } from "@ai-sdk/provider";
import { type ResultPromise } from "execa";
import { type z } from "zod";

import type { ToolNameSchema } from "./name";

import { type AppConfig } from "../lib/app-config/types";

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
    signal: AbortSignal;
  }) => Promise<ExecuteResult<z.output<TOutputSchema>>>;
  inputSchema: TInputSchema;
  name: TName;
  outputSchema: TOutputSchema;
  readOnly: boolean;
  timeoutMs: ((options: { input: z.output<TInputSchema> }) => number) | number;
  toModelOutput: (options: {
    output: z.output<TOutputSchema>;
  }) => LanguageModelV2ToolResultOutput;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyAgentTool = AgentTool<any, any, any>;

export type ShellResult = Promise<
  Result<ResultPromise<{ cancelSignal: AbortSignal; cwd: string }>, Error>
>;

export type ToolName = z.output<typeof ToolNameSchema>;

type ExecuteResult<T> = Result<T, { message: string; type: "execute-error" }>;
