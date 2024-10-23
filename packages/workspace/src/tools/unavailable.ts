import { err } from "neverthrow";
import { dedent } from "radashi";
import { z } from "zod";

import { createTool } from "./create-tool";

export const Unavailable = createTool({
  description: dedent`
    A placeholder tool for unknown or unavailable tools.

    - This tool is used when a requested tool is not available or not implemented.
    - It provides a standardized response for missing functionality.
  `,
  execute: () =>
    Promise.resolve(
      err({
        message: "This tool is not available or not implemented.",
        type: "execute-error",
      }),
    ),
  inputSchema: z.any(),
  name: "unavailable",
  outputSchema: z.any(),
  readOnly: true,
  timeoutMs: 1000,
  toModelOutput: () => {
    return {
      type: "text",
      value: "This tool is not available.",
    };
  },
});
