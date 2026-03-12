import { type Result } from "neverthrow";

import { type ExecuteError } from "../lib/execute-error";
import { isAsyncIterable } from "../lib/is-async-iterable";
import { type AnyAgentTool } from "../tools/types";

type ExecuteOptions = Parameters<AnyAgentTool["execute"]>[0];
type ExecuteResult = Result<unknown, ExecuteError>;

export async function* streamTool({
  execute,
  options,
}: {
  execute: AnyAgentTool["execute"];
  options: ExecuteOptions;
}): AsyncGenerator<
  | { output: ExecuteResult; type: "final" }
  | { output: ExecuteResult; type: "preliminary" }
> {
  const result = execute(options);

  if (isAsyncIterable(result)) {
    let lastOutput: ExecuteResult | undefined;
    for await (const output of result) {
      lastOutput = output;
      yield { output, type: "preliminary" };
    }
    if (lastOutput !== undefined) {
      yield { output: lastOutput, type: "final" };
    }
  } else {
    // TypeScript can't narrow the union after the AsyncIterable check
    yield { output: await (result as Promise<ExecuteResult>), type: "final" };
  }
}
