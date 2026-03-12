import { type Result } from "neverthrow";
import { type output } from "zod";

import { type ExecuteError } from "../../lib/execute-error";
import { isAsyncIterable } from "../../lib/is-async-iterable";
import { type AgentTool, type AnyAgentTool } from "../../tools/types";

type ExecuteOptions<T extends AnyAgentTool> = Parameters<T["execute"]>[0];
type ExecuteOutput<T extends AnyAgentTool> =
  T extends AgentTool<infer _N, infer _I, infer O>
    ? Result<output<O>, ExecuteError>
    : never;

export async function runTool<T extends AnyAgentTool>(
  tool: T,
  options: ExecuteOptions<T>,
): Promise<ExecuteOutput<T>> {
  const result = tool.execute(options);

  if (isAsyncIterable(result)) {
    let lastOutput: Result<unknown, ExecuteError> | undefined;
    for await (const output of result) {
      lastOutput = output;
    }
    if (lastOutput === undefined) {
      throw new Error("AsyncGenerator yielded no values");
    }
    return lastOutput as ExecuteOutput<T>;
  }

  return result as Promise<Result<unknown, ExecuteError>> as Promise<
    ExecuteOutput<T>
  >;
}
